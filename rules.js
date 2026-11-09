// =====================================================================
// rules.js  —  ALL the tip rules live in this one file.
//
// HOW TO ADD A NEW RULE (easy!):
//   1. Scroll down to the RULES list.
//   2. Copy one block { type: ..., check: function (text) { ... } },
//   3. Paste it, change the "type" and write your own check.
//   check(text) gets what the user typed. It must return:
//      - a tip object { title, message, example }  if the rule matches
//      - null                                       if it does not
//
// HOW TO ADD A NEW TYPE OF TIP (with its own on/off switch):
//   Add a line to TIP_TYPES below. The popup switch appears automatically.
// =====================================================================


// ---------------------------------------------------------------------
// 1) TIP TYPES — each one gets an on/off switch in the popup.
// ---------------------------------------------------------------------
const TIP_TYPES = {
  privacy: {
    icon: "🔒",
    label: "Privacy warning",
    description: "Warns you before you share phone numbers, emails, Aadhaar or OTPs."
  },
  prompt: {
    icon: "✍️",
    label: "Better prompt tips",
    description: "Suggests adding more detail when your prompt is very short."
  },
  needAI: {
    icon: "🤔",
    label: "Do you need AI?",
    description: "Reminds you a calculator, dictionary or search may be quicker."
  },
  ethics: {
    icon: "🎓",
    label: "Learn, don't copy",
    description: "Reminds you to follow school rules when asking for homework help."
  },
  factcheck: {
    icon: "✅",
    label: "Fact-check reminder",
    description: "After the AI replies, reminds you to double-check important facts."
  }
};

// Every tip type is switched ON by default.
// (This is built automatically from TIP_TYPES, so you never need to edit it.)
const DEFAULT_SETTINGS = {};
for (const type in TIP_TYPES) {
  DEFAULT_SETTINGS[type] = true;
}


// ---------------------------------------------------------------------
// 2) HELPER FUNCTIONS — small checks that some rules share.
// ---------------------------------------------------------------------

// Counts the words in the text. "hi there friend" -> 3
function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Does the prompt look like simple maths? e.g. "what is 25 x 4"
function looksLikeMaths(text) {
  let t = text.toLowerCase();
  // Remove question words like "what is" or "calculate"
  t = t.replace(/\b(what is|what's|whats|calculate|solve|how much is|tell me|please)\b/g, " ");
  // Turn maths words into symbols, e.g. "plus" -> "+"
  t = t.replace(/\bplus\b/g, "+")
       .replace(/\bminus\b/g, "-")
       .replace(/\b(times|multiplied by|into|of)\b/g, "*")
       .replace(/\bdivided by\b/g, "/");
  // What is left must be ONLY numbers, symbols and spaces...
  const onlyMathsCharacters = /^[\d\s.,+\-*/x×÷^%()=?!]+$/.test(t);
  // ...and have at least "number  symbol  number"
  const hasASum = /\d\s*%?\s*[+\-*/x×÷^]\s*\d/.test(t);
  return onlyMathsCharacters && hasASum;
}

// Is the user asking how to spell a word?
function looksLikeSpelling(text) {
  return countWords(text) <= 12 &&
    /\b(how (do|to) (you |i )?spell|spelling of|spell check|correct spelling|is it spelled|is it spelt)\b/i.test(text);
}

// Is the user asking for the time or date?
function looksLikeTimeOrDate(text) {
  return /^\s*(hey\s+|hi\s+)?(what('s| is) the (time|date|day)( today| now| right now)?( in [a-z ]+)?|what time is it( now)?( in [a-z ]+)?|what is today'?s date|today'?s date|what day is (it|today))\s*[?.!]*\s*$/i.test(text);
}

// Phrases that suggest copying instead of learning.
// Add more phrases to this list any time!
const COPYING_PHRASES = [
  "write my essay",
  "write an essay for me",
  "write my assignment",
  "do my assignment",
  "do my homework",
  "complete my homework",
  "solve my homework",
  "do my project",
  "write my project",
  "give me all the answers",
  "give me the answers",
  "answers to my exam",
  "answers for my exam",
  "answers to the test"
];


// ---------------------------------------------------------------------
// 3) THE RULES — each rule checks the prompt and maybe returns a tip.
// ---------------------------------------------------------------------
const RULES = [

  // ----- PRIVACY: email address -----
  {
    type: "privacy",
    check: function (text) {
      if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)) {
        return {
          title: "Looks like an email address",
          message: "Don't share personal info with AI. Remove it or use a fake one.",
          example: "Try: name@example.com"
        };
      }
      return null;
    }
  },

  // ----- PRIVACY: phone number (Indian mobile, with or without +91) -----
  {
    type: "privacy",
    check: function (text) {
      if (/(\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/.test(text)) {
        return {
          title: "Looks like a phone number",
          message: "Don't share personal info with AI. Remove it or hide the digits.",
          example: "Try: 98XXXXXXXX"
        };
      }
      return null;
    }
  },

  // ----- PRIVACY: 12-digit number (like Aadhaar) -----
  {
    type: "privacy",
    check: function (text) {
      if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(text)) {
        return {
          title: "Looks like an ID number (Aadhaar?)",
          message: "Don't share personal info with AI. ID numbers should stay private.",
          example: "Try: XXXX XXXX 1234"
        };
      }
      return null;
    }
  },

  // ----- PRIVACY: OTP / PIN / code (4–8 digits near those words) -----
  // ("code" alone is skipped, so "python code for 1000 numbers" is fine)
  {
    type: "privacy",
    check: function (text) {
      const wordThenNumber = /\b(otp|pin|passcode|password|(verification|security|login|my|the) code)\b\D{0,20}\b\d{4,8}\b/i;
      const numberThenWord = /\b\d{4,8}\b\D{0,20}\b(otp|pin|passcode|password|(verification|security|login|my|the) code)\b/i;
      if (wordThenNumber.test(text) || numberThenWord.test(text)) {
        return {
          title: "Looks like an OTP or secret code",
          message: "Don't share personal info with AI. Never share OTPs or PINs with anyone.",
          example: ""
        };
      }
      return null;
    }
  },

  // ----- PROMPT TIP: very short prompt -----
  {
    type: "prompt",
    check: function (text) {
      const words = countWords(text);
      // Skip simple questions — the "Do you need AI?" rule handles those.
      const isSimpleQuestion = looksLikeMaths(text) || looksLikeSpelling(text) || looksLikeTimeOrDate(text);
      if (words > 0 && words < 8 && !isSimpleQuestion) {
        return {
          title: "Add a little more detail",
          message: "AI gives better answers when you share your Goal, Context, Instructions and Output.",
          example: "Instead of \"Instagram caption\", try: \"Write 3 short Instagram captions (Output) to sell my handmade diyas (Goal). I run a small home business in Jaipur (Context). Keep them friendly with 2 hashtags (Instructions).\""
        };
      }
      return null;
    }
  },

  // ----- DO YOU NEED AI? simple maths -----
  {
    type: "needAI",
    check: function (text) {
      if (looksLikeMaths(text)) {
        return {
          title: "A calculator could do this",
          message: "For simple sums, a calculator is faster and always correct. AI can sometimes get maths wrong!",
          example: ""
        };
      }
      return null;
    }
  },

  // ----- DO YOU NEED AI? spelling -----
  {
    type: "needAI",
    check: function (text) {
      if (looksLikeSpelling(text)) {
        return {
          title: "A dictionary could do this",
          message: "For spellings, a dictionary or spell-check is quick and reliable.",
          example: ""
        };
      }
      return null;
    }
  },

  // ----- DO YOU NEED AI? time / date -----
  {
    type: "needAI",
    check: function (text) {
      if (looksLikeTimeOrDate(text)) {
        return {
          title: "Your phone or a search can tell you",
          message: "Check your clock or do a quick search. AI may not know today's date or time.",
          example: ""
        };
      }
      return null;
    }
  },

  // ----- ETHICS: copying homework -----
  {
    type: "ethics",
    check: function (text) {
      const lower = text.toLowerCase();
      const found = COPYING_PHRASES.some(function (phrase) {
        return lower.includes(phrase);
      });
      if (found) {
        return {
          title: "Use AI to learn, not to copy",
          message: "Check your school's rules about AI. Ask AI to explain or give feedback, so you really learn.",
          example: "Try: \"Explain the main ideas for my essay on plastic pollution, and give me feedback on my first paragraph.\""
        };
      }
      return null;
    }
  }

  // ➕ Add your new rules here (remember the comma after the block above!)
];


// ---------------------------------------------------------------------
// 4) RUN ALL RULES — content.js calls this with the prompt text.
//    "settings" tells us which tip types are switched on.
// ---------------------------------------------------------------------
function getTips(text, settings) {
  const tips = [];
  for (const rule of RULES) {
    if (!settings[rule.type]) continue;          // this type is switched off
    const tip = rule.check(text);
    if (tip) {
      tip.type = rule.type;                       // remember which type it is
      tips.push(tip);
    }
  }
  return tips;
}
