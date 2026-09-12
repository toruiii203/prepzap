import { YoutubeTranscript } from "youtube-transcript";

async function test() {
  try {
    const res = await YoutubeTranscript.fetchTranscript("https://www.youtube.com/watch?v=e1zJ53lTr88");
    console.log("Success! Length:", res.length);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();
