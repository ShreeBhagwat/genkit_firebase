import * as z from "zod";

// Import the Genkit core libraries and plugins.
import { generate } from "@genkit-ai/ai";
import { configureGenkit } from "@genkit-ai/core";
import { firebase } from "@genkit-ai/firebase";
import { googleAI } from "@genkit-ai/googleai";
import { defineDotprompt, dotprompt } from "@genkit-ai/dotprompt";
import { gemini15Pro } from "@genkit-ai/googleai";

// Import models from the Google AI plugin. The Google AI API provides access to
// several generative models. Here, we import Gemini 1.5 Flash.
import { gemini15Flash } from "@genkit-ai/googleai";

// From the Firebase plugin, import the functions needed to deploy flows using
// Cloud Functions.
import { noAuth, onFlow } from "@genkit-ai/firebase/functions";
import { defineSecret } from "firebase-functions/params";
defineSecret("GOOGLE_GENAI_API_KEY");



configureGenkit({
  plugins: [
    firebase({ projectId: 'hashtag-hero-f99b7' }),

    dotprompt(),
   
    googleAI({ apiKey: 'AIzaSyDG9YTxtI6hSjsR--20n3lWuvGEuX9fieQ', apiVersion: ['v1', 'v1beta'] }),

  ],
  logLevel: "debug",
  enableTracingAndMetrics: true,
});

// Define a simple flow that prompts an LLM to generate menu suggestions.
export const menuSuggestionFlow = onFlow(
  {
    name: "menuSuggestionFlow",
    httpsOptions: { cors: true },
    inputSchema: z.string(),
    outputSchema: z.string(),
    authPolicy: noAuth(),

    //   authPolicy: firebaseAuth((user) => {
    //     // By default, the firebaseAuth policy requires that all requests have an
    //     // `Authorization: Bearer` header containing the user's Firebase
    //     // Authentication ID token. All other requests are rejected with error
    //     // 403. If your app client uses the Firebase Cloud Functions callable
    //     // functions feature, the library automatically attaches this header to
    //     // requests.

    //     // You should also set additional policy requirements as appropriate for
    //     // your app. For example:
    //     if (!user.email_verified) {
    //       throw new Error("Verified email required to run flow");
    //     }
    //   }
    // ),
  },
  async (subject) => {
    const prompt =
      `Give nice captions on ${subject} for social media posts.`;
    const llmResponse = await generate({
      model: gemini15Flash,
      prompt: prompt,
      config: {
        temperature: 1,
      },
    });
    return llmResponse.text();
  }

);

const captionSchema = z.object({
  text: z.string(),
  photoUrl: z.string(),
})

// Defining Promt
const captionPromtpt = defineDotprompt(
  {
    name: 'captionPrompt',
    model: gemini15Pro,
    input: {
      schema: captionSchema,
    },
    output: {
      format: 'text'
    },
    config: {
      temperature: 0.9 // Control randomness of responses
    },

  },
  `
  Generate a caption for the following image:
  {{media url=photoUrl}}. Limit the caption to 100 characters only.

  users information on image:
  {{text}}
  `
);

export const generateCaptions = onFlow({
  name: 'generateCaptions',
  inputSchema: z.any(),
  outputSchema: z.string(),
  httpsOptions: { cors: true },
  authPolicy: noAuth(),
}, async (parameters) => {

  const llmResponse = await captionPromtpt.generate({
    input: {
      text: parameters['text'],
      photoUrl: parameters['photoUrl']
    }
  }
  );
  return llmResponse.text();
});


