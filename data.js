const MODELS = [
  { name: "Claude Opus 4.5", provider: "Anthropic", size: "N/A", expert: 78.40, llm: 89.60, overall: 84.00, top: true },
  { name: "GPT-5.2 Pro", provider: "OpenAI", size: "N/A", expert: 77.70, llm: 89.80, overall: 83.75, top: true },
  { name: "Claude Sonnet 4.5", provider: "Anthropic", size: "N/A", expert: 77.20, llm: 89.40, overall: 83.30, top: true },
  { name: "GPT-5.2", provider: "OpenAI", size: "N/A", expert: 76.80, llm: 89.20, overall: 83.00 },
  { name: "Gemini 3 Pro", provider: "Google", size: "N/A", expert: 76.10, llm: 88.50, overall: 82.30 },
  { name: "Claude Sonnet 4", provider: "Anthropic", size: "N/A", expert: 75.60, llm: 88.10, overall: 81.85 },
  { name: "Gemini 3 Flash", provider: "Google", size: "N/A", expert: 74.90, llm: 87.60, overall: 81.25 },
  { name: "GPT-4.1", provider: "OpenAI", size: "N/A", expert: 74.40, llm: 87.20, overall: 80.80 },
  { name: "Gemini 2.5 Pro", provider: "Google", size: "N/A", expert: 73.70, llm: 86.70, overall: 80.20 },
  { name: "GPT-4.1 mini", provider: "OpenAI", size: "N/A", expert: 73.30, llm: 84.90, overall: 79.10 },
  { name: "GPT-5 mini", provider: "OpenAI", size: "N/A", expert: 71.50, llm: 85.80, overall: 78.65 },
  { name: "Claude Haiku 4.5", provider: "Anthropic", size: "N/A", expert: 71.90, llm: 84.60, overall: 78.25 },
  { name: "Gemini 2.0 Flash-Lite", provider: "Google", size: "N/A", expert: 71.10, llm: 84.30, overall: 77.70 },
  { name: "Phi-4-reasoning-plus", provider: "Microsoft", size: "14.7B", expert: 72.60, llm: 82.90, overall: 77.75, openSource: true },
  { name: "llama-3.3-70b-versatile", provider: "Meta", size: "70B", expert: 69.80, llm: 82.50, overall: 76.15, openSource: true },
  { name: "llama3-70b", provider: "Meta", size: "70B", expert: 68.40, llm: 82.80, overall: 75.60, openSource: true },
  { name: "gemma2-9b-it", provider: "Google", size: "9B", expert: 67.10, llm: 79.90, overall: 73.50 },
  { name: "Phi-4-reasoning", provider: "Microsoft", size: "14.7B", expert: 65.00, llm: 81.00, overall: 73.00 },
  { name: "Llama-3.1-8B-Instruct", provider: "Meta", size: "8B", expert: 62.00, llm: 78.70, overall: 70.35, openSource: true },
  { name: "Llama-3.1-8B", provider: "Meta", size: "8B", expert: 57.30, llm: 75.90, overall: 66.60 },
  { name: "Phi-4-mini-reasoning", provider: "Microsoft", size: "3.84B", expert: 58.60, llm: 72.80, overall: 65.70 },
  { name: "Llama-2-13b-chat-hf", provider: "Meta", size: "13B", expert: 55.00, llm: 71.30, overall: 63.15 },
  { name: "gemma-7b", provider: "Google", size: "7B", expert: 52.80, llm: 70.00, overall: 61.40 },
  { name: "Llama-3.2-1B-Instruct", provider: "Meta", size: "1.24B", expert: 50.40, llm: 68.40, overall: 59.40, bottom: true },
  { name: "phi-2", provider: "Microsoft", size: "2.7B", expert: 42.40, llm: 60.90, overall: 51.65, bottom: true },
  { name: "gemma-2-2b-it", provider: "Google", size: "2.61B", expert: 40.10, llm: 57.60, overall: 48.85, bottom: true },
];

const TOPIC_DATA = {
  labels: ["Foundational Concepts", "Gates & Circuits", "Error Correction", "Quantum Algorithms", "Quantum ML", "Distributed Computing", "Security"],
  claudeOpus45:  [90, 88, 86, 84, 83, 80, 76],
  gpt52Pro:      [89, 87, 85, 84, 82, 80, 76],
  claudeSonnet45:[89, 87, 85, 83, 82, 79, 75],
  average:       [72, 70, 68, 66, 65, 62, 58],
};

const SAMPLE_QUESTIONS = [
  {
    question: "Quantum principal component regression uses controlled rotations based on eigenvalues to:",
    A: "Scale each eigenvector by the reciprocal of its eigenvalue when forming the regression coefficients.",
    B: "Project the data onto random directions for dimensionality reduction.",
    C: "Introduce regularisation by discarding eigenvalues above one.",
    D: "Shift the singular values of the covariance matrix upward by one.",
    solution: "A"
  },
  {
    question: "What is the quantum Metropolis algorithm?",
    A: "A quantum gate that implements random walks on quantum states.",
    B: "An algorithm for optimizing the topology of quantum circuits.",
    C: "A quantum version of the classical Metropolis-Hastings algorithm for sampling from thermal distributions of many-body quantum systems.",
    D: "A quantum error correction technique based on random sampling of error syndromes.",
    solution: "C"
  },
  {
    question: "How do multi-core optical fibers potentially enhance hardware for distributed quantum computing networks?",
    A: "Multi-core fibers naturally generate entangled photon pairs between cores without external inputs",
    B: "They eliminate quantum decoherence regardless of transmission distance",
    C: "These fibers can transmit exactly seven different qubit encodings simultaneously",
    D: "They enable spatial-division multiplexing of many quantum channels in a single fiber, dramatically increasing network capacity while maintaining phase stability between cores for interferometric applications",
    solution: "D"
  },
  {
    question: "What is the relationship between quantum coherence and quantum entanglement?",
    A: "Coherence is a basis-dependent property of single quantum systems, while entanglement specifically describes non-classical correlations between subsystems.",
    B: "They are identical quantum resources described with different mathematical formalisms.",
    C: "Entanglement is a theoretical concept while coherence is the experimentally measurable quantity.",
    D: "Coherence applies to pure states while entanglement is meaningful only for mixed states.",
    solution: "A"
  },
  {
    question: "Quantum repeater chain controllers implement quorum consensus for routing decisions mainly to?",
    A: "Agree on global RF reference phase for microwave links spanning more than 500 km",
    B: "Handle classical message loss without stalling entanglement distribution across the network",
    C: "Synchronize furnace temperature cycles during fiber Bragg-grating annealing",
    D: "Determine IPsec encryption keys for classical side-channel authentication",
    solution: "B"
  },
  {
    question: "Variational approaches can approximate thermal states by minimising free energy which requires:",
    A: "Adding an entropy term computed from measured probabilities to the energy objective.",
    B: "Preparing a purification of the Gibbs state in twice the number of qubits.",
    C: "Running imaginary time evolution for exactly beta times the Hamiltonian norm.",
    D: "Measuring all two body correlation functions at each iteration.",
    solution: "A"
  },
];
