import {
  CustomBrailleDotBar,
  PackageSingleProgressBar,
  PackageMultiProgressBar,
} from "./TerminalProgress.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runMock() {
  console.log(
    "\n1. Custom Braille Dot Bar (Slowed Filling + Unique Random Constellation Every Run):",
  );
  const totalPages = 600;
  const TenthOfTheProcess = totalPages / 10;
  let currentPage = 0;
  let tick = 0;

  while (currentPage < totalPages) {
    const step =
      currentPage < TenthOfTheProcess
        ? [1, 2, 3, 2, 1][Math.floor(Math.random() * 5)]
        : [6, 10, 8, 14, 9, 12][Math.floor(Math.random() * 6)];

    currentPage = Math.min(totalPages, currentPage + step);

    CustomBrailleDotBar(
      currentPage,
      totalPages,
      "Scraping Naukri pages",
      28,
      tick++,
    );
    await sleep(currentPage < 60 ? 100 : 75);
  }

  console.log("\n2. Package Single Progress Bar:");
  const singleBar = PackageSingleProgressBar({
    label: "Scraping JobFound",
    total: 30,
  });
  for (let page = 1; page <= 30; page++) {
    await sleep(40);
    singleBar.update(page);
  }
  singleBar.stop();

  console.log("\n3. Package Multi Progress Bar (Parallel Workers):");
  const multiBar = PackageMultiProgressBar();
  const worker1Bar = multiBar.create(40, 0, {
    worker: "worker-1",
    platform: "naukri",
  });
  const worker2Bar = multiBar.create(25, 0, {
    worker: "worker-2",
    platform: "jobFound",
  });

  for (let step = 1; step <= 40; step++) {
    await sleep(50);
    worker1Bar.update(step);
    if (step <= 25) {
      worker2Bar.update(step);
    }
  }
  multiBar.stop();

  console.log("\nAll mock demonstrations finished.\n");
}

void runMock();
