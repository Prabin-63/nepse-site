module.exports = {
  apps: [
    {
      name: "nepse-app",
      script: "start.bat",
      exec_mode: "fork",
      interpreter: "cmd.exe",
      interpreter_args: "/c",
      watch: false
    }
  ]
};
