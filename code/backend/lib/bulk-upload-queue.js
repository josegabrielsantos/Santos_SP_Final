/**
 * Simple in-memory concurrency-limited queue for bulk PDF processing.
 *
 * Prevents overwhelming the Gemini API when multiple orgs run bulk uploads
 * simultaneously. Each PDF extraction is enqueued as a task; at most
 * MAX_CONCURRENT tasks run at once across all jobs.
 *
 * This is intentionally kept simple (no Redis/Bull dependency). For a
 * production scale-out you'd replace this with BullMQ or similar.
 */

const MAX_CONCURRENT = 3; // max parallel Gemini calls server-wide

let running = 0;
const queue = []; // { fn, resolve, reject }[]

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    drain();
  });
}

function drain() {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const { fn, resolve, reject } = queue.shift();
    running++;
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        running--;
        drain();
      });
  }
}

/**
 * Returns a snapshot of the queue state for diagnostics.
 */
function stats() {
  return { running, queued: queue.length, maxConcurrent: MAX_CONCURRENT };
}

export { enqueue, stats };
