if (!process.env.NODE_ENV) {
    require("dotenv").config();
}

const TeleBot = require("telebot");
const _ = require("lodash");
const loki = require("lokijs");
const http = require("http");

const bot = new TeleBot({
    token: process.env.BOT_TOKEN,
    usePlugins: ["askUser"],
});

// On start command
bot.on("/start", (msg) => {
    // const id = msg.from.id;
    // // Ask user name
    // return bot.sendMessage(id, "What is your name?", { ask: "name" });
});

//db code will be moved to db.js, quite soon
let States;
const databaseInitialize = () => {
    States = db.getCollection("states");
    if (States === null) {
        States = db.addCollection("states");
    }
};

const db = new loki("xpb.db");
databaseInitialize();

const getData = (msg) => {
    const offset = msg.entities[0].length;
    const data = msg.text.slice(offset + 1);
    return data;
};

const initialState = {
    userList: {},
    name: "",
    options: [],
    votes: [],
};

const getStateForChat = (chatID) => {
    let currentState = States.findOne({
        chatID,
    });

    if (!currentState) {
        currentState = Object.assign({}, _.cloneDeep(initialState), {
            chatID,
        });
    }

    return currentState;
};

// =============================================
// === cleaned start
// =============================================

bot.on("/new", (msg) => {
    // console.log(msg);
    // console.log(msg.chat.id);

    let state = getStateForChat(msg.chat.id);
    let name = getData(msg);

    if (name && name.length > 0) {
        if (!state.meta) {
            States.insert(
                Object.assign({}, state, {
                    name,
                })
            );
        } else {
            States.update(
                Object.assign({}, state, _.cloneDeep(initialState), {
                    name,
                })
            );
        }

        msg.reply.text("Got it. Okay guys start voting!");
    } else {
        msg.reply.text("Starting a new poll!").then((res) => {
            if (!state.meta) {
                States.insert(state);
            } else {
                state = Object.assign({}, state, _.cloneDeep(initialState));
                state.userList[msg.from.id] = "title";
                States.update(state);
            }
            return bot.sendMessage(msg.chat.id, "What is the poll about?", {
                ask: "title",
                replyMarkup: {
                    force_reply: true,
                    selective: true,
                },
                replyToMessage: msg.message_id,
            });
        });
    }
});

bot.on("*", (msg, props) => {
    let state = getStateForChat(msg.chat.id);

    const userID = msg.from.id;
    const ask = state.userList[userID];

    if (ask) {
        bot.event("ask." + ask, msg, props);
        state.userList[userID] = false;
        States.update(state);
    }
});

bot.on("/titlechange", (msg) => {
    let state = getStateForChat(msg.chat.id);

    state.userList[msg.from.id] = "titlechange";
    States.update(state);

    return bot.sendMessage(msg.chat.id, "What is the title of the poll?", {
        ask: "titlechange",
        replyMarkup: {
            force_reply: true,
            selective: true,
        },
        replyToMessage: msg.message_id,
    });
});

// Ask name event
bot.on("ask.title", (msg) => {
    let state = getStateForChat(msg.chat.id);

    //TODO should include empty check
    state.name = msg.text;
    States.update(state);

    msg.reply.text(`Understood.\nOkay guys start voting on:\n${msg.text}`);
});

bot.on("ask.titlechange", (msg) => {
    let state = getStateForChat(msg.chat.id);

    //TODO should include empty check
    state.name = msg.text;
    States.update(state);

    msg.reply.text(`Okay! Title of the poll changed to:\n${msg.text}`);
});

// =============================================
// === cleaned end
// =============================================

// Ask name event

bot.on("/add", (msg) => {
    let state = getStateForChat(msg.chat.id);

    let option = getData(msg).trim();

    if (option && option.length > 0) {
        const responses = [
            "not literally!",
            "very funny",
            "roflcopter i am flying",
            "Somebody's gonna get hurt, real bad",
        ];

        const helperMsg = `\ntype \`/add <actual option>\` e.g. \`/add pikachu\``;

        switch (option) {
            case "nothing":
                return bot.sendMessage(
                    msg.chat.id,
                    "You *literally* added nothing!" + helperMsg,
                    { parseMode: "Markdown", replyToMessage: msg.message_id }
                );
            case "something":
            case "<something>":
            case "option":
            case "<option>":
                return bot.sendMessage(
                    msg.chat.id,
                    responses[Math.round(Math.random() * 3)] + helperMsg,
                    { parseMode: "Markdown", replyToMessage: msg.message_id }
                );
            case "<actual option>":
            case "actual option":
                return bot.sendMessage(msg.chat.id, "RKO OUTTA NOWHERE!!!", {
                    parseMode: "Markdown",
                    replyToMessage: msg.message_id,
                });
            default: {
                state.options.push(option);
                States.update(state);
                return msg.reply.text(option + " added as an option");
            }
        }
    } else {
        bot.sendMessage(
            msg.chat.id,
            "You added nothing! type `/add <something>` to add option",
            { parseMode: "Markdown", replyToMessage: msg.message_id }
        );
    }
});

bot.on("/vote", (msg) => {
    let state = getStateForChat(msg.chat.id);

    let option = getData(msg);
    if (option && option.length > 0) {
        bot.sendMessage(msg.chat.id, "Your vote is captured", {
            replyMarkup: {
                remove_keyboard: true,
                selective: true,
            },
            replyToMessage: msg.message_id,
        })
            .then((res) => {
                bot.deleteMessage(res.result.chat.id, res.result.message_id);

                // CASE INSENSITIVE CHECK -- START
                // Create a regex based on 'option', to search case insensitively
                let searchregex = new RegExp(`^${option}$`, "i");

                // Search each vote using the regex. matchedIndex is assigned -1 if no votes match case insensitive search
                let matchedIndex = state.votes.findIndex((vote) => {
                    return vote.option.match(searchregex) !== null;
                });

                // For matched result, make the current vote option follow previously existing variant
                if (matchedIndex !== -1) {
                    option = state.votes[matchedIndex].option;
                }
                // CASE INSENSITIVE CHECK -- END

                let vote = {
                    user: msg.from,
                    option,
                };
                let index = state.votes.findIndex((vote) => {
                    if (vote.user) {
                        return vote.user.id == msg.from.id;
                    }
                });
                if (index !== -1) {
                    state.votes[index] = vote;
                } else {
                    state.votes.push(vote);
                }

                // AD-HOC OPTIONS ADDED TO VOTE OPTIONS --  START
                let matchedOptionIndex = state.options.findIndex((opt) => {
                    return opt.match(searchregex) !== null;
                });

                if (matchedOptionIndex === -1) {
                    // Naively adds ad-hoc options into the vote options after making 1 check to ensure entry was not previously used
                    state.options.push(option);
                }
                // AD-HOC OPTIONS ADDED TO VOTE OPTIONS --  END

                States.update(state);
            })
            .then(() => {
                bot.event("/result", msg);
            })
            .catch((err) => {
                console.log(err);
            });
    } else {
        if (state.options.length == 0) {
            return bot.sendMessage(
                msg.chat.id,
                `There is no official options added yet!\nTry \`/add <option>\` or /vote <option> directly!`,
                { parseMode: "Markdown", replyToMessage: msg.message_id }
            );
        } else {
            let replyMarkup = bot.keyboard(
                state.options.map((option) => {
                    return [bot.button("/vote " + option)];
                })
            );

            // console.log(msg);
            // msg.from.id
            // msg.message_id
            // msg.chat.id
            return bot.sendMessage(msg.chat.id, "Please cast your vote", {
                replyMarkup: Object.assign({}, replyMarkup, {
                    resize_keyboard: true,
                    selective: true,
                }),
                replyToMessage: msg.message_id,
            });
        }
    }
});

bot.on("/result", (msg) => {
    let state = getStateForChat(msg.chat.id);

    let tmp = _.groupBy(state.votes, (vote) => vote.option);
    let tmp3 = "";
    _.forIn(tmp, (value, key) => {
        tmp3 += `${key} (${value.length} votes) \n`;

        // if (Math.random() > 0.5) {
        //     tmp3 += value.length + ": " + key + "\n";
        // } else {

        // }

        value.forEach((vote) => {
            tmp3 += "- " + (vote.user.first_name || vote.user.username) + "\n";
        });
    });
    let text = `topic: ${state.name}\n`;
    text += `=======================\n`;
    text += `${tmp3}`;

    msg.reply.text(text);
});

bot.start();

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("Hello World!\n");
});

server.listen(3000);
