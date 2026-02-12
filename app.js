// ===== Nav Toggle =====
document.querySelector('.nav-toggle').addEventListener('click', () => {
  document.querySelector('.nav-links').classList.toggle('active');
});

// Close nav on link click
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('active');
  });
});

// ===== Leaderboard =====
let currentSort = 'overall';
let currentProvider = 'all';

function getProviderClass(provider) {
  const map = {
    'OpenAI': 'provider-openai',
    'Anthropic': 'provider-anthropic',
    'Google': 'provider-google',
    'Meta': 'provider-meta',
    'Microsoft': 'provider-microsoft',
  };
  return map[provider] || 'provider-other';
}

function getScoreColor(score) {
  if (score >= 80) return 'var(--green)';
  if (score >= 70) return 'var(--blue)';
  if (score >= 60) return 'var(--orange)';
  return 'var(--red)';
}

function renderLeaderboard() {
  const filtered = currentProvider === 'all'
    ? [...MODELS]
    : MODELS.filter(m => m.provider === currentProvider);

  filtered.sort((a, b) => b[currentSort] - a[currentSort]);

  const tbody = document.getElementById('leaderboard-body');
  tbody.innerHTML = filtered.map((m, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-default';
    const rowClass = m.top ? 'row-top' : m.bottom ? 'row-bottom' : m.openSource ? 'row-opensource' : '';
    const sortVal = m[currentSort];

    return `<tr class="${rowClass}">
      <td class="rank-col"><span class="rank-badge ${rankClass}">${rank}</span></td>
      <td><span class="model-name">${m.name}</span></td>
      <td><span class="provider-badge ${getProviderClass(m.provider)}">${m.provider}</span></td>
      <td style="color: var(--text-secondary)">${m.size}</td>
      <td class="score-col"><div class="score-bar-cell">
        <div class="score-bar-bg"><div class="score-bar-fill" style="width:${m.expert}%;background:${getScoreColor(m.expert)}"></div></div>
        <span class="score-value" style="color:${getScoreColor(m.expert)}">${m.expert.toFixed(1)}</span>
      </div></td>
      <td class="score-col"><div class="score-bar-cell">
        <div class="score-bar-bg"><div class="score-bar-fill" style="width:${m.llm}%;background:${getScoreColor(m.llm)}"></div></div>
        <span class="score-value" style="color:${getScoreColor(m.llm)}">${m.llm.toFixed(1)}</span>
      </div></td>
      <td class="score-col"><div class="score-bar-cell">
        <div class="score-bar-bg"><div class="score-bar-fill" style="width:${m.overall}%;background:${getScoreColor(m.overall)}"></div></div>
        <span class="score-value" style="color:${getScoreColor(m.overall)}">${m.overall.toFixed(2)}</span>
      </div></td>
    </tr>`;
  }).join('');
}

document.getElementById('provider-filter').addEventListener('change', e => {
  currentProvider = e.target.value;
  renderLeaderboard();
});

document.getElementById('sort-select').addEventListener('change', e => {
  currentSort = e.target.value;
  document.querySelectorAll('.sortable').forEach(th => th.classList.remove('active'));
  document.querySelector(`[data-sort="${currentSort}"]`).classList.add('active');
  renderLeaderboard();
});

renderLeaderboard();

// ===== Charts =====
const chartDefaults = {
  color: '#9ba3b5',
  borderColor: 'rgba(42,52,80,0.5)',
};
Chart.defaults.color = chartDefaults.color;
Chart.defaults.borderColor = chartDefaults.borderColor;

// Topic radar chart
new Chart(document.getElementById('topicChart'), {
  type: 'radar',
  data: {
    labels: TOPIC_DATA.labels,
    datasets: [
      {
        label: 'Claude Opus 4.5',
        data: TOPIC_DATA.claudeOpus45,
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        pointBackgroundColor: '#fbbf24',
        borderWidth: 2,
      },
      {
        label: 'GPT-5.2 Pro',
        data: TOPIC_DATA.gpt52Pro,
        borderColor: '#34d399',
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
        pointBackgroundColor: '#34d399',
        borderWidth: 2,
      },
      {
        label: 'Claude Sonnet 4.5',
        data: TOPIC_DATA.claudeSonnet45,
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        pointBackgroundColor: '#60a5fa',
        borderWidth: 2,
      },
      {
        label: 'All Models Avg',
        data: TOPIC_DATA.average,
        borderColor: '#6b7280',
        backgroundColor: 'rgba(107, 114, 128, 0.05)',
        pointBackgroundColor: '#6b7280',
        borderWidth: 1,
        borderDash: [5, 5],
      },
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 50,
        max: 100,
        ticks: { stepSize: 10, backdropColor: 'transparent' },
        grid: { color: 'rgba(42,52,80,0.4)' },
        angleLines: { color: 'rgba(42,52,80,0.4)' },
        pointLabels: { font: { size: 12 } }
      }
    },
    plugins: {
      legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } }
    }
  }
});

// ===== Sample Questions =====
let questionsShown = 4;

function renderQuestions() {
  const grid = document.getElementById('questions-grid');
  const toShow = SAMPLE_QUESTIONS.slice(0, questionsShown);
  grid.innerHTML = toShow.map((q, i) => `
    <div class="question-card">
      <div class="question-number">Question ${i + 1}</div>
      <div class="question-text">${q.question}</div>
      <div class="question-options">
        ${['A','B','C','D'].map(letter => `
          <div class="option ${q.solution === letter ? 'correct' : ''}">
            <span class="option-letter">${letter}.</span>
            <span>${q[letter]}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  const btn = document.getElementById('load-more-btn');
  btn.style.display = questionsShown >= SAMPLE_QUESTIONS.length ? 'none' : 'inline-block';
}

document.getElementById('load-more-btn').addEventListener('click', () => {
  questionsShown = Math.min(questionsShown + 4, SAMPLE_QUESTIONS.length);
  renderQuestions();
});

renderQuestions();
