/**
 * Guardian Flag Validation
 * Early validation of flags and options to catch errors before module load.
 */

const VALID_SUBCOMMANDS = [
  'init', 'protect', 'reality', 'attempt', 'baseline',
  'presets', 'evaluate', 'version', 'flow', 'scan', 'smoke', 'check'
];

const VALID_GLOBAL_FLAGS = [
  '--help', '-h', '--version', '-v', '--debug'
];

const VALID_SUBCOMMAND_FLAGS = {
  'scan': ['--url', '--preset', '--artifacts', '--policy', '--headful', '--no-trace', '--no-screenshots', '--watch', '-w', '--fast', '--fail-fast', '--timeout-profile', '--attempts', '--parallel', '--help', '-h'],
  'protect': ['--url', '--policy', '--webhook', '--watch', '-w', '--fast', '--fail-fast', '--timeout-profile', '--attempts', '--parallel', '--help', '-h'],
  'reality': ['--url', '--attempts', '--artifacts', '--policy', '--discover', '--universal', '--webhook', '--headful', '--watch', '-w', '--no-trace', '--no-screenshots', '--fast', '--fail-fast', '--timeout-profile', '--parallel', '--help', '-h'],
  'attempt': ['--url', '--attempt', '--artifacts', '--headful', '--no-trace', '--no-screenshots', '--help', '-h'],
  'smoke': ['--url', '--headful', '--budget-ms', '--help', '-h'],
  'check': ['--url', '--headful', '--budget-ms', '--help', '-h'],
  'baseline': [],
  'init': ['--preset', '--help', '-h'],
  'presets': ['--help', '-h']
};

function validateFlags(argv) {
  const args = argv.slice(2);
  if (args.length === 0) return { valid: true };

  const subcommand = args[0];

  // Check if it's a global flag or help
  if (VALID_GLOBAL_FLAGS.includes(subcommand)) {
    return { valid: true };
  }

  // Check if subcommand is valid
  if (subcommand && !subcommand.startsWith('-') && !VALID_SUBCOMMANDS.includes(subcommand)) {
    return {
      valid: false,
      error: `Unknown command '${subcommand}'`,
      hint: `Valid commands: ${VALID_SUBCOMMANDS.slice(0, 5).join(', ')}, …`
    };
  }

  // If we have a valid subcommand, validate its flags
  if (VALID_SUBCOMMANDS.includes(subcommand)) {
    const validFlags = VALID_SUBCOMMAND_FLAGS[subcommand] || [];
    const subArgs = args.slice(1);

    for (let i = 0; i < subArgs.length; i++) {
      const arg = subArgs[i];
      if (arg.startsWith('--') || arg.startsWith('-')) {
        const flagName = arg.split('=')[0]; // Handle --flag=value
        if (!validFlags.includes(flagName)) {
          return {
            valid: false,
            error: `Unknown flag '${flagName}' for command '${subcommand}'`,
            hint: `Run 'guardian ${subcommand} --help' for valid options.`
          };
        }
        // Check if flag expects a value
        if ((flagName.includes('--') && !arg.includes('=')) || (flagName === '-w')) {
          const expectsValue = ![
            '--headful', '--watch', '-w', '--discover', '--universal',
            '--no-trace', '--no-screenshots', '--help', '-h'
          ].includes(flagName);

          if (expectsValue && i + 1 < subArgs.length && subArgs[i + 1].startsWith('-')) {
            return {
              valid: false,
              error: `Flag '${flagName}' requires a value`,
              hint: `Usage: guardian ${subcommand} ${flagName} <value>`
            };
          }
        }
      }
    }
  }

  return { valid: true };
}

function reportFlagError(validation) {
  if (!validation.valid) {
    console.error(`Error: ${validation.error}`);
    if (validation.hint) {
      console.error(`Hint:  ${validation.hint}`);
    }
  }
}

module.exports = {
  validateFlags,
  reportFlagError,
  VALID_SUBCOMMANDS
};
