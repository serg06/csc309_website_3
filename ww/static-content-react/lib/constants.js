// Can change:
global.wwPort = 10600;
global.wwHostname = "localhost"; // Change if running anywhere but localhost

// Don't change:
global.wwWsPort = global.wwPort+1;
global.wwWsURL = "ws://"+global.wwHostname+":"+global.wwWsPort;
