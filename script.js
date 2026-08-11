let score = 0;
const scoreEl = document.getElementById('score');
const helloBtn = document.getElementById('helloBtn');

helloBtn.addEventListener('click', () => {
  score += 1;
  scoreEl.textContent = score;
});
