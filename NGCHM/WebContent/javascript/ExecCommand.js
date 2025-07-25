(function () {
  "use strict";
  NgChm.markFile();

  // Define Namespace for executing commands.
  const EXEC = NgChm.createNS("NgChm.EXEC");

  const UTIL = NgChm.importNS("NgChm.UTIL");
  const PARSER = NgChm.importNS("NgChm.Parser");

  EXEC.runCommand = function runCommand (commandText, output, showResult = true) {
    try {
      const args = PARSER.parseCommand(commandText);
      return EXEC.execCommand (args, output, showResult);
    } catch (error) {
      if (error instanceof Error) {
        console.error(error);
      }
      output.error(error);
    }
  };

  // Export FUNCTION EXEC.execCommand (args, output) - Executes the
  // command specified by args. Trace and errors are output to the
  // output. If showResult is true, the result returned by the
  // command is also written to the output.
  EXEC.execCommand = function execCommand(args, output, showResult = true) {
    if (args.length == 0) {
      return;
    }
    const cmd = UTIL.getCommand(args[0]);
    if (!cmd) {
      execMiddleWare ([
        unknownCommand
      ], args, output);
      return;
    } else if (UTIL.isCommand(cmd)) {
      if (false && args[args.length - 1] == "--help") {
        execMiddleWare ([ setSubCommand, cmd.help ], args.slice(0, args.length-1), output);
        return;
      } else {
        const result = execMiddleWare (cmd.route, args, output);
        if (showResult && typeof result != "undefined") {
          writeResult (result, output);
        }
        return result;
      }
    } else {
      console.warn ('EXEC.execCommand: cmd is not a Command object', { args, cmd });
      if (args[args.length - 1] == "--help") {
        cmd.showHelp(args.slice(0, args.length - 1), output);
        return;
      } else {
        const result = cmd(args, output);
        if (showResult && typeof result != "undefined") {
          writeResult (result, output);
        }
        return result;
      }
    }
    // Helper functions.
    function setSubCommand (req, res, next) {
      if (args.length > 0) {
       req.subcommand = req.args.shift();
      }
      next();
    }
    function writeResult (result, output) {
      output.write("Result:");
      for (const line of JSON.stringify(result,null,2).split("\n")) {
        output.write(line);
      }
    }
  };

  function unknownCommand(req, res, next) {
    const output = res.output;
    output.error(`Unknown command: ${req.command}`);
    output.write();
    next(UTIL.writeKnownCommands);
  }

  function execMiddleWare(route, args, output) {
    const req = {};
    req.command = args[0];
    req.args = args.slice(1);
    const res = {};
    res.output = output;

    next(Array.isArray(route) ? route.flat() : [route], 0);
    return res.value;

    function next(route, index) {
      if (index < route.length) {
        if (typeof route[index] != "function") {
          throw new Error ("non-function in route");
        }
        route[index](req, res, (rr) => {
          if (rr) {
            // Execute the first item in route passed to next.
            next(Array.isArray(rr) ? rr : [rr], 0);
          } else {
            // Execute the next item in the current route.
            next(route, index + 1);
          }
        });
      }
    }
  }

  EXEC.doSubCommand = function doSubCommand (subCommands, helpFn, req, res, next) {
    try {
      req.subcommand = ""; // For error message in catch.
      if (req.args.length == 0) {
        throw `subcommand expected`;
      }
      if (req.args[0] == "--help") {
        return next (helpFn);
      }
      if (req.args[0].substr(0,2) == "--") {
        throw `unexpected option ${req.args[0]}`;
      }
      req.subcommand = req.args.shift();
      if (!subCommands.has(req.subcommand)) {
        throw `unknown subcommand`;
      }
      if (req.args.length > 0) {
        if (req.args[0] == "--help" || req.args[req.args.length-1] == "--help") {
          return next (helpFn);
        }
      }
      return next(subCommands.get(req.subcommand).route);
    } catch (error) {
      if (error instanceof Error) {
        console.error (error);
      }
      res.output.error(`${req.command} ${req.subcommand}: ${error}.`);
      return next ([].concat(helpFn).concat(helpOptionHelp));
    }
  };

  EXEC.showOptions = function showOptions (route) {
    return function (req, res, next) {
      res.output.write();
      res.output.write("Options:");
      res.output.write();
      res.output.indent();
      next (route);
      res.output.unindent();
    };
  };

  function helpOptionHelp(req,res,next) {
    res.output.write("");
    res.output.write("Append --help to a subcommand for detailed help.");
    next();
  }

  // Returns a function that processes leading options.
  EXEC.genGetOptions = function genGetOptions (...optionsArray) {
    const options = mergeMaps (optionsArray);
    return function (req, res, next) {
      while (req.args.length > 0 && req.args[0].substr(0,2) == "--") {
        if (req.args[0] == "--help") {
          break;
        }
        const arg = req.args.shift();
        if (arg == "--") {
          break;
        }
        if (!options.has(arg)) {
          throw `option ${arg} is not expected here`;
        }
        const opt = options.get(arg);
        if (req.args.length < opt.args) {
          throw `option ${arg} requires ${opt.args} parameter${opt.args>1?"s":""}`;
        }
        if (opt.args == 0) {
          req[opt.field] = true;
        } else if (opt.args == 1) {
          req[opt.field] = req.args.shift();
        } else {
          req[opt.field] = req.args.splice(0,opt.args);
        }
      }
      next();
    }
    // Helper function.
    // Merges an array of maps into a single map.
    // If the same key exists in multiple maps, the result
    // will contain the entry from the last map containing
    // that key.
    function mergeMaps (mapArray) {
      const union = new Map();
      for (const map of mapArray) {
        for (const [ key, value ] of map) {
          union.set (key, value);
        }
      }
      return union;
    }
  }

  // Returns a middleware that outputs a brief listing of the
  // available subcommands.
  EXEC.genSubCommandHelp = function genSubCommandHelp (subCommands) {
    return function subCommandHelp (req, res, next) {
      const output = res.output;
      output.write("");
      const props = subCommands.get (req.subcommand);
      if (props) {
        output.write(`Usage: ${req.command} ${req.subcommand} ${props.synopsis}`);
        output.write();
        if (props.helpRoute) {
          return next (props.helpRoute);
        } else {
          console.log(`Old style help still on ${req.command} ${req.subcommand}`);
          output.write(props.help);
        }
      } else {
        output.write("Usage:");
        output.indent();
        output.write("");
        for (const [name, props] of subCommands) {
          output.write(`${req.command} ${name} ${props.synopsis}`);
        }
        output.unindent();
      }
      next();
    }
  }

  // Middleware that throws an error if there are any parameters left over.
  EXEC.noMoreParams = function noMoreParams(req, res, next) {
    if (req.args.length != 0) {
      throw `excess parameter(s)`;
    }
    next();
  };

  // Middleware that consumes the next arg and sets req.axis to its
  // canonical value.
  const axisNames = [ "row", "column" ];
  EXEC.reqAxis = function reqAxis(req, res, next) {
    if (req.args.length == 0) {
      throw `missing axis parameter`;
    }
    req.axis = EXEC.mustMatch(req.args.shift(), axisNames);
    next();
  };

  // Function that returns the canonical value of param.
  // param must be a unique abbreviation of a string in allowedValues.
  EXEC.mustMatch = function mustMatch(param, allowedValues) {
    const substrs = allowedValues.map((v) => v.substr(0, param.length));
    const numMatches = substrs.filter((v) => v == param).length;
    if (numMatches != 1) {
      throw `parameter '${param}' is not a unique substring of: ${allowedValues.join(", ")}`;
    }
    return allowedValues[substrs.indexOf(param)];
  };

  // Middleware that consumes the next arg and sets req.color to its value.
  EXEC.reqColor = function reqColor(req, res, next) {
    if (req.args.length == 0) {
      throw `missing color parameter`;
    }
    req.color = validateColor(req.args.shift());
    next();
  };

  EXEC.reqColorArray = function reqColorArray (req, res, next) {
    if (req.args.length == 0) {
      throw `missing color parameters`;
    }
    req.colors = [];
    while (req.args.length > 0) {
      req.colors.push (validateColor(req.args.shift()));
    }
    next();
  };

  function validateColor (color) {
    if (color.length != 7 || !/^#[0-9A-Fa-f]*$/.test(color)) {
      throw `the format of color parameter "${color}" is not recognized`;
    }
    return color;
  }

  const dataTypes = [ "discrete", "continuous" ];
  EXEC.reqDataType = function reqDataType (req, res, next) {
    if (req.args.length == 0) {
      throw `missing data type parameter`;
    }
    req.datatype = EXEC.mustMatch(req.args.shift(), dataTypes);
    next();
  };

  EXEC.genRequired = function (name, emptyOK = false) {
    return function getRequired (req, res, next) {
      if (req.args.length == 0) {
        throw `missing ${name} parameter`;
      }
      req[name] = req.args.shift();
      if (!emptyOK) {
        if (req[name].length == 0) {
          throw `${name} parameter cannot be empty`;
        }
      }
      next();
    };
  };

  EXEC.helpDataType = function (req, res, next) {
    res.output.write();
    res.output.write("Datatype must be discrete or continuous.");
    next();
  };

  EXEC.helpColorValue = function (req, res, next) {
    res.output.write();
    res.output.write("Colors must be hex color strings. e.g. #ff0000.");
    next();
  };

  UTIL.registerCommand ("help", helpCommand, helpCommand);

  function helpCommand(req, res, next) {
    if (req.args.length > 0) {
      const cmd = UTIL.getCommand(req.args[0]);
      req.command = req.args[0];
      if (cmd) {
        next(cmd.help);
      } else {
        next(unknownCommand);
      }
      return;
    }
    const output = res.output;
    output.write();
    output.write(`Append the --help flag to a command for help specific to that command.`);
    output.write();
    next(UTIL.writeKnownCommands);
  }
})();
