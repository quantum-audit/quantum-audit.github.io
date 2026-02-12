#!/usr/bin/env python3
"""
Quantum-Audit Benchmark — evaluate LLMs on quantum computing MCQs.

pip install anthropic openai google-genai

Usage:
    python benchmark.py                                           # all models, expert_written
    python benchmark.py --dataset llm_extracted                   # different dataset
    python benchmark.py --provider anthropic --model sonnet       # specific model
    python benchmark.py --provider openai --model gpt-4.1         # OpenAI model
    python benchmark.py --range 1-100                             # subset of questions
"""

import argparse
import asyncio
import json
import os
import re
import sys
import time
from pathlib import Path

MODELS = {
    "anthropic": {
        "sonnet": "claude-sonnet-4-5-20250929",
        "opus": "claude-opus-4-5-20251101",
        "haiku": "claude-haiku-4-5-20251001",
    },
    "openai": {
        "gpt-5.2-pro": "gpt-5.2-pro",
        "gpt-5.2": "gpt-5.2",
        "gpt-5-mini": "gpt-5-mini",
        "gpt-4.1": "gpt-4.1",
        "gpt-4.1-mini": "gpt-4.1-mini",
    },
    "gemini": {
        "gemini-3-pro": "gemini-3-pro-preview",
        "gemini-3-flash": "gemini-3-flash-preview",
        "gemini-2.5": "gemini-2.5-pro",
        "gemini-2.0-flash-lite": "gemini-2.0-flash-lite",
    },
}

DATASETS = ["expert_written", "llm_extracted", "complete", "qa500"]
MAX_CONCURRENCY = 15
MAX_RETRIES = 3


def build_prompt(q):
    return f"""You are an expert in quantum computing. Choose the correct answer.

Question: {q['question']}
A. {q['A']}
B. {q['B']}
C. {q['C']}
D. {q['D']}

Answer with only one letter: A, B, C, or D.

Answer:"""


def parse_answer(text):
    text = text.strip().upper()
    match = re.search(r"[A-D]", text)
    return match.group(0) if match else "?"


# ── Provider query functions ─────────────────────────────────────────────────

async def query_anthropic(sem, model_id, prompt):
    from anthropic import AsyncAnthropic
    if not hasattr(query_anthropic, "_client"):
        query_anthropic._client = AsyncAnthropic()
    async with sem:
        resp = await query_anthropic._client.messages.create(
            model=model_id,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=5,
        )
        return resp.content[0].text


async def query_openai(sem, model_id, prompt):
    from openai import AsyncOpenAI
    if not hasattr(query_openai, "_client"):
        query_openai._client = AsyncOpenAI()
    async with sem:
        resp = await query_openai._client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=5,
        )
        return resp.choices[0].message.content


async def query_gemini(sem, model_id, prompt):
    from google import genai
    from google.genai import types
    if not hasattr(query_gemini, "_client"):
        query_gemini._client = genai.Client(
            api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
        )
    async with sem:
        resp = await asyncio.to_thread(
            query_gemini._client.models.generate_content,
            model=model_id,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=5),
        )
        return resp.text


QUERY_FN = {
    "anthropic": query_anthropic,
    "openai": query_openai,
    "gemini": query_gemini,
}


# ── Results cache ────────────────────────────────────────────────────────────

RESULTS_DIR = Path("results")


def results_path(provider, model_key, dataset):
    return RESULTS_DIR / f"{dataset}__{provider}_{model_key}.json"


def load_results(provider, model_key, dataset):
    path = results_path(provider, model_key, dataset)
    if path.exists():
        return json.loads(path.read_text())
    return {}


def save_results(provider, model_key, dataset, results):
    RESULTS_DIR.mkdir(exist_ok=True)
    path = results_path(provider, model_key, dataset)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    tmp.rename(path)


# ── Evaluate ─────────────────────────────────────────────────────────────────

async def evaluate_question(sem, query_fn, model_id, q, q_idx, cached, status):
    key = str(q_idx)
    if key in cached:
        status["skipped"] += 1
        return q_idx, cached[key]

    prompt = build_prompt(q)
    for attempt in range(MAX_RETRIES):
        try:
            raw = await query_fn(sem, model_id, prompt)
            predicted = parse_answer(raw)
            result = {
                "predicted": predicted,
                "correct": q["solution"],
                "is_correct": predicted == q["solution"],
            }
            status["done"] += 1
            status["correct"] += int(result["is_correct"])
            return q_idx, result
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(min(2 ** (attempt + 1), 30))
            else:
                print(f"\n  Q{q_idx}: FAILED after {MAX_RETRIES} attempts: {e}")
                status["errors"] += 1
                return q_idx, None


async def progress_printer(status, total, interval=2):
    t0 = time.time()
    while not status.get("finished"):
        await asyncio.sleep(interval)
        done = status["done"]
        skipped = status["skipped"]
        acc = status["correct"] / done * 100 if done > 0 else 0
        elapsed = time.time() - t0
        print(
            f"\r  {done + skipped}/{total} | "
            f"New: {done} | Cached: {skipped} | "
            f"Acc: {status['correct']}/{done} ({acc:.1f}%) | "
            f"{elapsed:.0f}s   ",
            end="", flush=True,
        )


async def run_benchmark(provider, model_key, model_id, questions, dataset):
    fn = QUERY_FN[provider]
    cached = load_results(provider, model_key, dataset)
    total = len(questions)
    already = sum(1 for idx, _ in questions if str(idx) in cached)

    print(f"\n  Model:   {model_key} ({model_id})")
    print(f"  Cached:  {already}/{total} — running {total - already}")

    if already == total:
        print("  All cached.")
    else:
        sem = asyncio.Semaphore(MAX_CONCURRENCY)
        status = {"done": 0, "skipped": 0, "correct": 0, "errors": 0, "finished": False}

        printer = asyncio.create_task(progress_printer(status, total))
        tasks = [
            evaluate_question(sem, fn, model_id, q, idx, cached, status)
            for idx, q in questions
        ]
        results_raw = await asyncio.gather(*tasks, return_exceptions=True)

        status["finished"] = True
        await asyncio.sleep(0.1)
        printer.cancel()

        for r in results_raw:
            if isinstance(r, Exception) or r is None:
                continue
            idx, result = r
            if result is not None:
                cached[str(idx)] = result

        save_results(provider, model_key, dataset, cached)

    correct = sum(1 for r in cached.values() if r["is_correct"])
    total_done = len(cached)
    acc = correct / total_done * 100 if total_done else 0
    print(f"  Result:  {correct}/{total_done} ({acc:.1f}%)")
    return acc


async def main():
    parser = argparse.ArgumentParser(description="Quantum-Audit Benchmark")
    parser.add_argument("--dataset", "-d", default="expert_written",
                        choices=DATASETS, help="Dataset to evaluate")
    parser.add_argument("--provider", "-p", default=None,
                        choices=list(MODELS.keys()), help="Provider (default: all)")
    parser.add_argument("--model", "-m", default=None,
                        help="Model short name, e.g. sonnet, gpt-4.1 (default: all for provider)")
    parser.add_argument("--range", "-r", default=None,
                        help="Question range, e.g. 1-100 (1-indexed, inclusive)")
    parser.add_argument("--concurrency", "-c", type=int, default=MAX_CONCURRENCY)
    args = parser.parse_args()

    global MAX_CONCURRENCY
    MAX_CONCURRENCY = args.concurrency

    data_file = Path(f"{args.dataset}.json")
    if not data_file.exists():
        data_file = Path("data") / f"{args.dataset}.json"
    if not data_file.exists():
        print(f"ERROR: {args.dataset}.json not found")
        sys.exit(1)

    all_questions = json.loads(data_file.read_text())

    if args.range:
        parts = args.range.split("-")
        start, end = int(parts[0]), int(parts[1]) if len(parts) > 1 else int(parts[0])
        questions = [(i, all_questions[i - 1]) for i in range(start, end + 1)]
    else:
        questions = [(i + 1, q) for i, q in enumerate(all_questions)]

    # Build list of (provider, model_key, model_id) to run
    to_run = []
    if args.provider and args.model:
        if args.model not in MODELS[args.provider]:
            print(f"Unknown model '{args.model}' for {args.provider}")
            print(f"Available: {', '.join(MODELS[args.provider].keys())}")
            sys.exit(1)
        to_run.append((args.provider, args.model, MODELS[args.provider][args.model]))
    elif args.provider:
        for key, mid in MODELS[args.provider].items():
            to_run.append((args.provider, key, mid))
    elif args.model:
        for prov, models in MODELS.items():
            if args.model in models:
                to_run.append((prov, args.model, models[args.model]))
                break
        else:
            print(f"Unknown model '{args.model}'")
            sys.exit(1)
    else:
        for prov, models in MODELS.items():
            for key, mid in models.items():
                to_run.append((prov, key, mid))

    print(f"{'=' * 60}")
    print(f"  Quantum-Audit Benchmark")
    print(f"{'=' * 60}")
    print(f"  Dataset:    {args.dataset} ({len(all_questions)} questions)")
    print(f"  Range:      {questions[0][0]}-{questions[-1][0]} ({len(questions)} questions)")
    print(f"  Models:     {len(to_run)}")
    print(f"  Concurrency: {MAX_CONCURRENCY}")
    print(f"{'=' * 60}")

    results = {}
    for provider, model_key, model_id in to_run:
        acc = await run_benchmark(provider, model_key, model_id, questions, args.dataset)
        results[f"{provider}/{model_key}"] = acc

    if len(results) > 1:
        print(f"\n{'=' * 60}")
        print(f"  SUMMARY: {args.dataset}")
        print(f"{'=' * 60}")
        for name, acc in sorted(results.items(), key=lambda x: x[1], reverse=True):
            print(f"  {name:30s}  {acc:.1f}%")
        print(f"{'=' * 60}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n\n  Interrupted.\n")
        sys.exit(0)
