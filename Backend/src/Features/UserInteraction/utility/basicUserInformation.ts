import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";
import { JOb_SEARCH_URL_WITH_QUERY } from "../../../constants.js";
import _ from "lodash"

const rl = createInterface({
  input: stdin,
  output: stdout,
});

async function collectAnswers(obj) {
  const answers = {};

  for (const [key, value] of Object.entries(obj.flatMap())) {
    // Nested question group
    if (typeof value === "object" && value !== null && !("question" in value)) {
      answers[key] = await collectAnswers(value);
      continue;
    }

    // Question
    if (value.question) {
      let answer;

      while (true) {
        answer = (await rl.question(value.question)).trim();

        if (!value.required || answer !== "") {
          break;
        }

        console.log("This question is required.");
      }

      answers[key] = answer;
    }
  }

  return answers;
}

const answers = await collectAnswers(JOb_SEARCH_URL_WITH_QUERY);

console.log(JSON.stringify(answers, null, 2));

rl.close();