(function () {
  "use strict";
  NgChm.markFile();

  // Define Namespace for Command Parser.
  const PARSER = NgChm.createNS("NgChm.Parser");

  const UTIL = NgChm.importNS("NgChm.UTIL");
  const debugParser = UTIL.getDebugFlag("parser");
  const debugLexer = UTIL.getDebugFlag("lexer");

  // This function parses the string input and returns an array
  // of "words".
  // A word is a sequence of characters. Words are normally
  // terminated by white space characters. Quotes (either
  // single or double) can be used to include spaces in words.
  // Backslashes (\) can be used to protect quotes.
  PARSER.parseCommand = function parseCommand(input) {
    // The lexer extracts tokens from the input string.
    const lexer = createLexer(input);
    // The parser assembles the tokens into "words".
    return parse (lexer);
  };

  // Assembles tokens from the lexer into an array of words.
  function parse (lexer) {
    const quotes = ["single-quote", "double-quote"];
    const cmd = [];  // An array of completed words.
    let wordStarted = false;  // A new word has been started.
    let word = ""; // The current (incomplete) content of the new word.
    // Parser state can be one of:
    // "single-quote": within a single-quoted string
    // "double-quote": within a double-quoted string
    // "continuation": immediately after a line that ended in a backslash.
    // "normal": any other time.
    let state = "normal"; // The current parser state.
    const stack = []; // A stack of saved states.
    for (let ii = 0; ; ii++) {
      const token = lexer.lex();
      if (!token) break;
      const { type, lexeme } = token;
      if (type == "EOF") break;
      if (debugParser) console.log(`Token ${ii}: ${type}: ${lexeme}`);
      if (state == "normal") {
        // Assembling a "word", not within a string.
        switch (type) {
          case "word":
            // Add to current word.
            word += lexeme;
            wordStarted = true;
            break;
          case "continuation":
            // Save current state so we can see what's next then come back to this mode.
            stack.push(state);
            state = type;
            break;
          case "single-quote":
          case "double-quote":
            // Set wordStarted so that even empty strings become words.
            wordStarted = true;
            // Change into string state.
            state = type;
            break;
          case "escaped":
            // Add escaped character to current word.
            word += lexeme[1];
            wordStarted = true;
            break;
          case "space":
            // Terminate current word and initialize the next one.
            if (wordStarted) {
              cmd.push(word);
              wordStarted = false;
              word = "";
            }
        }
      } else if (quotes.includes(state)) {
        // Within either type of quoted string.
        if (type == state) {
          // Terminating quote for this type of string.
          state = "normal";
        } else if (type == "escaped") {
          // Add escaped character to current word.
          word += lexeme[1];
        } else if (type == "continuation") {
          // Save current state so we can see what's next then come back to this mode.
          stack.push(state);
          state = "continuation";
        } else {
          // space, word, or the other type of quote.
          // Add content to current word.
          word += lexeme;
        }
      } else if (state == "continuation" && type == "space" && lexeme[0] == "\n") {
        // Newline following a backslash.
        state = stack.pop();
        if (state == "normal") {
          if (lexeme.length > 1) {
            // Any more spaces than the newline terminates the current word.
            if (word) cmd.push (word);
            word = "";
          }
        } else {
          // Add any spaces following the newline to the quoted string.
          word += lexeme.substr(1);
        }
      } else {
        throw new Error("Parser: Unexpected parse state: " + state);
      }
    }
    // EOF seen.
    if (state == "normal") {
      // Push current word, if any.
      if (wordStarted) {
        cmd.push(word);
      }
      if (debugParser) console.log("Parsed command:", { cmd });
      // Return word array.
      return cmd;
    } else if (quotes.includes(state)) {
      throw `Parser: Unterminated ${state} string`;
    } else if (state == "continuation") {
      throw "Parser: No continuation line";
    } else {
      throw "Parser: Unexpected parse state: " + state;
    }
  };

  // Return a lexer for converting the string input into a sequence of tokens.
  // Each call to lexer.get returns a token object with two fields: type and lexeme.
  // lexeme is a string that is defined for some token types.
  // type is a string that can have the following values:
  // "EOF" - The end of the input string.
  // "single-quote" - A single quote
  // "double-quote" - A double quote
  // "escaped" - An escaped character. lexeme equals the escaped character.
  // "word" - A sequence of one or more non-whitespace characters. lexeme contains the characters.
  // "space" - A sequence of one or more whitespace characters. lexeme contains the characters.
  // "continuation" - A backslash at the end of a line.
  //
  function createLexer(input) {
    const lexer = new Lexer(function (lexeme, other) {
      if (debugLexer) console.log("Match no rule", { lexeme, other });
      // The only input we do not match is a backslash followed by
      // an end of line or the end of the input.
      return { type: "continuation", lexeme };
    })
      .addRule(/$/, function (lexeme, other) {
        // Matched end-of-line.
        if (debugLexer) console.log('Match "/$/"', { lexeme, other });
        return { type: "EOF", lexeme };
      })
      .addRule(
        /"/, // Fix nvim quote matching: "
        function (lexeme, other) {
          // Matched double-quote.
          if (debugLexer) console.log("Match double-quote", { lexeme, other });
          return { type: "double-quote", lexeme };
        }
      )
      .addRule(
        /'/, // Fix nvim quote matching: '
        function (lexeme, other) {
          // Matched single-quote.
          if (debugLexer) console.log("Match single quote", { lexeme, other });
          return { type: "single-quote", lexeme };
        }
      )
      .addRule(/\\./, function (lexeme, other) {
        // Matched backslash followed by another character.
        if (debugLexer) console.log("Match escaped char", { lexeme, other });
        return { type: "escaped", lexeme };
      })
      .addRule(/[^'"\\\s]+/, // Fix nvim quote matching: "'
        // Matched a sequence of word characters until the next quote, backslash, or space.
        function (lexeme, other) {
        if (debugLexer) console.log("Match word", { lexeme, other });
        return { type: "word", lexeme };
      })
      .addRule(/\s+/, function (lexeme, other) {
        // Matched a sequence of space characters.
        if (debugLexer) console.log('Match space "/[\W]+/"', { lexeme, other });
        return { type: "space", lexeme };
      });
    lexer.setInput(input);
    return lexer;
  }

})();
