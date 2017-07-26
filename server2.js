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

// let state = {
//     options: ["dummyOption1", "dummyOption2"],
//     votes: [
//         {
//             user: "dummyUser1",
//             option: "dummyOption1"
//         },
//         {
//             user: "dummyUser2",
//             option: "dummyOption1"
//         },
//         {
//             user: "dummyUser3",
//             option: "dummyOption2"
//         }
//     ]
// };

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
            // console.log(res);
            // return bot.sendMessage(msg.chat.id, "What is the poll about?", {
            //     ask: "name",
            //     replyMarkup: {
            //         selective: true
            //     },
            //     replyToMessage: msg.message_id
            // });

            state.userList[msg.from.id] = "name";

            return bot.sendMessage(msg.chat.id, "What is the poll about?", {
                ask: "name",
                replyMarkup: {
                    force_reply: true,
                    selective: true
                },
                replyToMessage: msg.message_id
            });
        });
    }
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
bot.on("ask.name", msg => {
    //TODO should include empty check
    state.name = msg.text;
    msg.reply.text("Got it. Okay guys start voting!");
});

bot.on("/add", msg => {
    let option = getData(msg).trim();

    if (option && option.length > 0) {
        state.options.push(option);
        msg.reply.text(option + " added as an option");
    } else {
        msg.reply.text("you added nothing!");
    }
});

bot.on("/vote", msg => {
    // console.log(msg);
    let option = getData(msg);

    if (option && option.length > 0) {
        bot
            .sendMessage(msg.chat.id, "Your vote is captured", {
                replyMarkup: {
                    remove_keyboard: true,
                    trueselective: true
                },
                replyToMessage: msg.message_id
            })
            .then(() => {
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
            });
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
