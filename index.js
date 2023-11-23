import { createInterface } from 'node:readline/promises';
import { env as environment, exit, stdin as input, stdout as output } from 'node:process';
import OpenAI from 'openai';

const EXIT_COMMAND = 'exit';
const SYSTEM_ROLE = 'system';
const USER_ROLE = 'user';

const apiKey = environment.CHATGPT_CLI_SECRET_KEY;
if (!apiKey?.length) {
  console.error(`You must specify "CHATGPT_CLI_SECRET_KEY" via the environment`);
  exit(1);
}

const openAI = new OpenAI({ apiKey });
const fitOutputToScreen = (environment.CHATGPT_CLI_FIT_OUTPUT_TO_SCREEN ?? 'true') === 'true';
const model = environment.CHATGPT_CLI_MODEL ?? 'gpt-3.5-turbo';
const prompt = environment.CHATGPT_CLI_PROMPT ?? '> ';
const readline = createInterface({
  input,
  output,
  terminal: true,
  historySize: 0
});

const formatOutput = content => {
  if (!fitOutputToScreen) return content;
  const maxLineLength = process.stdout.columns;
  if (content.length <= maxLineLength) return content;
  return content.replace(
    new RegExp(`(?![^\\n]{1,${maxLineLength}}$)([^\\n]{1,${maxLineLength}})\\s`, 'g'),
    '$1\n'
  );
};

const chatbotType = await readline.question(
  `What type of chatbot would you like to create?\n\n${prompt}`
);

if (chatbotType === EXIT_COMMAND) {
  exit(0);
}

const messages = [{ role: SYSTEM_ROLE, content: chatbotType }];
let userInput = await readline.question(`\nSay hello to your new assistant.\n\n${prompt}`);

while (userInput !== EXIT_COMMAND) {
  messages.push({ role: USER_ROLE, content: userInput });
  try {
    const response = await openAI.chat.completions.create({ messages, model });

    const responseMessage = response?.data?.choices?.[0]?.message;
    if (responseMessage) {
      messages.push(responseMessage);
      userInput = await readline.question(
        `\n${formatOutput(responseMessage.content)}\n\n${prompt}`
      );
    } else {
      userInput = await readline.question(`\nNo response, try asking again\n\n${prompt}`);
    }
  } catch (error) {
    console.log(error.message);
    userInput = await readline.question(`\nSomething went wrong, try asking again\n\n${prompt}`);
  }
}

readline.close();
