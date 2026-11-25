// Coerce CocoaPods Pod::Executable output to UTF-8 so non-ASCII workspace
// paths (e.g. Arabic directory names) do not trip ASCII-8BIT/UTF-8 podspecs.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const MARKER = '# @roi/with-utf8-pods';
const SNIPPET = `${MARKER}
if defined?(Pod::Executable)
  Pod::Executable.singleton_class.class_eval do
    unless method_defined?(:_roi_orig_execute_command)
      alias_method :_roi_orig_execute_command, :execute_command
      def execute_command(executable, command, raise_on_failure = true)
        out = _roi_orig_execute_command(executable, command, raise_on_failure)
        out.is_a?(String) ? out.dup.force_encoding(Encoding::UTF_8) : out
      end
    end
  end
end
`;

module.exports = (config) =>
  withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const src = fs.readFileSync(podfile, 'utf8');
      if (!src.includes(MARKER)) {
        fs.writeFileSync(podfile, `${SNIPPET}\n${src}`);
      }
      return cfg;
    },
  ]);
