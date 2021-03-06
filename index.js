const discord = require("discord.js");
const echo = require("../../echo.js");
const moduleConfig = require("./module.json");
const config = require("./config.json");
const fs = require("fs");
const EventEmitter = require("events").EventEmitter;
const defaultConfig = JSON.stringify({
    "defaultPrefix": "?",
    "token": "insert token here",
    "multiserver": false
})
class blu_discord extends echo.EchoModule {
    constructor(name) {
        super();
        this.name = name;
        this.client = new discord.Client();
    }
    moduleInitialize(bot) {
        this.bot = bot;
        if(!fs.existsSync(__dirname+"/config.json")) {
            fs.writeFileSync(__dirname+"/config.json", defaultConfig);
        }
        if(config.token === "insert token here" || !config.token) {
            this.bot.log(this.name, 4, "please insert token in config.json in the "+this.name+" module folder.");
        }
    }
    getCommands() {
        return [
            "prefix",
            "presence"
        ];
    }
    allModulesLoaded() {
        // Check Dependencies:
        if(config.multiserver) {
            var missedAnyDependencies = false;
            moduleConfig.dependencies.forEach(dependency => {
                if(!this.bot.moduleExists(dependency)) {
                    missedAnyDependencies = true;
                    var blu_packagemanager = require("../../blu-packagemanager.js");
                    blu_packagemanager.installPackage(dependency);
                }
            });
            if(missedAnyDependencies) {
                this.bot.log(this.name, 4, "missed dependencies. Please restart bot.");
            }
            else {
                this.mapped_dependencies = this.bot.callModule("blu-mapper", this.name, moduleConfig["mapped-dependencies"]);
                this.bot.log(this.name, 1, "loaded all mapped dependencies: "+JSON.stringify(this.mapped_dependencies));
            }
            this.client.on("message", function(message){
                if(!this.multiservercache) {
                    this.multiservercache = {}
                }
                if(message.channel.type == "text") {
                    var cacheresponse = this.multiservercache[message.guild.id];
                    if(!cacheresponse) {
                        cacheresponse = this.bot.callModule(this.mapped_dependencies["database"], "get", {
                            "module": "blu-discord",
                            "task": "serverprefix"
                        }).prefix;
                        if(!prefix) {
                            cacheresponse = config.defaultPrefix;
                        }
                        multiservercache[message.guild.id] = cacheresponse;
                    }
                    if(message.content.startsWith(cacheresponse)) {
                        this.bot.commandCalled(message.content.split(" ")[0].replace(cacheresponse, ""), message);
                    }
                }
            })
        }
    }
    moduleCalled(data) {

    }
    commandCalled(command, args) {
        switch(command) {
            case "prefix":
                var newPrefix = args.content.split(" ")[1];
                if(newPrefix) {
                    if(!config.multiserver) {
                        args.channel.send("* This server has multiserver features, including server prefixes, disabled. Please contact the bot administrator for details.");
                        return 0;
                    }
                    else {
                        var userPermissions = this.bot.callModule(this.mapped_dependencies["permissions"], {
                            "command": "checkPermissions",
                            "node": "blu-discord.prefix",
                            "data": args
                        });
                        if(userPermissions["permission"]) {
                            if(args.channel.type == "text") {
                                this.bot.callModule(this.mapped_dependencies["database"], "set", {
                                    "module": "blu-discord",
                                    "task": "serverprefix",
                                    "serverid": args.guild.id,
                                    "newprefix": newPrefix,
                                });
                                args.channel.send("* The new prefix is: "+newPrefix);
                            }
                            else if(args.channel.type == "dm") {
                                this.bot.callModule(this.mapped_dependencies["database"], "set", {
                                    "module": "blu-discord",
                                    "task": "dmprefix",
                                    "userid": args.author.id,
                                    "newprefix": newPrefix,
                                });
                                args.channel.send("* The new prefix is: "+newPrefix);
                            }
                            else if(args.channel.type == "group") {
                                args.channel.send("* Changing prefix in group chats is not yet supported.");
                            }
                        }
                        
                    }
                }
                else {
                    args.channel.send("* Usage: prefix <newprefix>");
                }
        }
    }
    getClient() {
        return this.client;
    }
}
module.exports = new blu_discord("blu-discord");