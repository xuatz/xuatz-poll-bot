if (!process.env.NODE_ENV) {
    require("dotenv").config();
}

const TeleBot = require("telebot");
const _ = require("lodash");

const bot = new TeleBot({
    token: process.env.BOT_TOKEN,
    usePlugins: ["askUser"]
});

// On start command
bot.on("/start", msg => {
    // const id = msg.from.id;
    // // Ask user name
    // return bot.sendMessage(id, "What is your name?", { ask: "name" });
});

const initialState = {
    userList: {},
    name: "",
    options: [],
    votes: []
};

let state = _.cloneDeep(initialState);

const getData = msg => {
    const offset = msg.entities[0].length;
    const data = msg.text.slice(offset + 1);
    return data;
};

bot.on("/new", msg => {
    state = _.cloneDeep(initialState);

    let name = getData(msg);

    if (name && name.length > 0) {
        state.name = name;
        msg.reply.text("Got it. Okay guys start voting!");
    } else {
        msg.reply.text("Starting a new poll!").then(res => {
            state.userList[msg.from.id] = "title";

            return bot.sendMessage(msg.chat.id, "What is the poll about?", {
                ask: "title",
                replyMarkup: {
                    force_reply: true,
                    selective: true
                },
                replyToMessage: msg.message_id
            });
        });
    }
});

bot.on("/titlechange", msg => {
    state.userList[msg.from.id] = "titlechange";

    return bot.sendMessage(msg.chat.id, "What is the title of the poll?", {
        ask: "titlechange",
        replyMarkup: {
            force_reply: true,
            selective: true
        },
        replyToMessage: msg.message_id
    });
});

bot.on("*", (msg, props) => {
    const userID = msg.from.id;
    const ask = state.userList[userID];

    if (ask) {
        bot.event("ask." + ask, msg, props);
        state.userList[userID] = false;
    }
});

// Ask name event
bot.on("ask.title", msg => {
    //TODO should include empty check
    state.name = msg.text;
    msg.reply.text(`Got it. Okay guys start voting on:\n${msg.text}`);
});

// Ask name event
bot.on("ask.titlechange", msg => {
    //TODO should include empty check
    state.name = msg.text;
    msg.reply.text(`Okay! Title of the poll changed to:\n${msg.text}`);
});

bot.on("/add", msg => {
    let option = getData(msg).trim();

    if (option && option.length > 0) {
        const responses = [
            "not literally!",
            "very funny",
            "roflcopter i am flying",
            "Somebody's gonna get hurt, real bad"
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
                    replyToMessage: msg.message_id
                });
            default: {
                state.options.push(option);
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

bot.on("/vote", msg => {
    let option = getData(msg);
    if (option && option.length > 0) {
        bot
            .sendMessage(msg.chat.id, "Your vote is captured", {
                replyMarkup: {
                    remove_keyboard: true,
                    selective: true
                },
                replyToMessage: msg.message_id
            })
            .then(res => {
                bot.deleteMessage(res.result.chat.id, res.result.message_id);

                let vote = {
                    user: msg.from,
                    option
                };
                let index = state.votes.findIndex(vote => {
                    if (vote.user) {
                        return vote.user.id == msg.from.id;
                    }
                });
                if (index !== -1) {
                    state.votes[index] = vote;
                } else {
                    state.votes.push(vote);
                }
            })
            .then(() => {
                bot.event("/result", msg);
            })
            .catch(err => {
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
                state.options.map(option => {
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
                    selective: true
                }),
                replyToMessage: msg.message_id
            });
        }
    }
});

bot.on("/result", msg => {
    let tmp = _.groupBy(state.votes, vote => vote.option);
    let tmp3 = "";
    _.forIn(tmp, (value, key) => {
        tmp3 += `${key} (${value.length} votes) \n`;

        // if (Math.random() > 0.5) {
        //     tmp3 += value.length + ": " + key + "\n";
        // } else {

        // }

        value.forEach(vote => {
            tmp3 += "- " + (vote.user.first_name || vote.user.username) + "\n";
        });
    });
    let text = `topic: ${state.name}\n`;
    text += `=======================\n`;
    text += `${tmp3}`;

    msg.reply.text(text);
});

bot.start();
