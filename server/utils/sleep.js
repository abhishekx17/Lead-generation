const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomDelay = (minMs = 2000, maxMs = 4000) => {
  const delay = minMs + Math.random() * (maxMs - minMs);
  return sleep(delay);
};

module.exports = { sleep, randomDelay };
