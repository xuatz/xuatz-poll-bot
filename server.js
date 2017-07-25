if (!process.env.NODE_ENV) {
    require("dotenv").config();
}

const Telegraf = require("telegraf");
const _ = require("lodash");

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(Telegraf.memorySession());

// console.log(Telegraf);

let hasPoll = false;

let state = {
    options: ["dummyOption1", "dummyOption2"],
    votes: [
        {
            user: "dummyUser1",
            option: "dummyOption1"
        },
        {
            user: "dummyUser2",
            option: "dummyOption1"
        },
        {
            user: "dummyUser3",
            option: "dummyOption2"
        }
    ]
};

bot.command("start", ({ from, reply }) => {
    console.log("start", from);
    return reply("Welcome!");
});

bot.hears("hi", ctx => ctx.reply("Hey there!"));
bot.on("sticker", ctx => ctx.reply("👍"));

bot.command("/oldschool", ctx => ctx.reply("Hello"));

bot.command("/poll", ctx => {
    if (!hasPoll) {
        ctx.reply("Okay, new poll started!");
        hasPoll = true;
    } else {
        ctx.reply("There is already a poll");
    }
});

bot.command("/addoption", ctx => {
    let option = ctx.update.message.text.slice(11);
    console.log(option.length, option);

    if (option && option.length > 0) {
        state.options.push(option);

        ctx.reply(option + " added as an option").then(result => {
            console.log(result);
            ctx.reply("current options are: " + state.options);
        });

        console.log(state.options);
    }
});

bot.command("/vote", ctx => {
    console.log("/vote =======================");
    let { first_name, username } = ctx.update.message.from;

    let user = username || first_name;
    let option = ctx.update.message.text.slice(6);

    console.log(option.length, option);
    console.log(ctx);
    console.log(ctx.update.message);

    // ctx.reply(
    //     "One time keyboard",
    //     Telegraf.Markup
    //         .keyboard(["/simple", "/inline", "/pyramid"])
    //         .oneTime()
    //         .resize()
    //         .extra()
    // );

    if (state.options.length > 0) {
        if (option && option.length > 0) {
            let index = state.votes.findIndex(vote => {
                return vote.user == user;
            });

            let vote = {
                user,
                option
            };

            if (index !== -1) {
                state.votes[index] = vote;
            } else {
                state.votes.push(vote);
                // console.log("=====", state.votes);
            }

            // console.log(ctx);
            // console.log(ctx.update);

            ctx.reply(user + " have voted for: " + option).then(res => {
                let tmp = _.groupBy(state.votes, vote => vote.option);
                // console.log(tmp);
                let tmp2 = [];
                let tmp3 = "";
                _.forIn(tmp, (value, key) => {
                    tmp2.push({
                        option: key,
                        count: value.length
                    });
                    tmp3 += key + ": " + value.length + "\n";
                });

                console.log(tmp3);

                ctx.reply(`current votes: \n=======================\n${tmp3}`);
            });
        } else {
            ctx.reply(
                "random example",
                Telegraf.Markup
                    .keyboard(
                        state.options.map(option => {
                            return "/vote " + option;
                        })
                    )
                    .oneTime()
                    .resize()
                    .extra()
            );
        }
    }
});

bot.on("callback_query", ctx => {
    console.log("callback???");

    console.log(ctx);
    console.log(ctx.tg);
    console.log(ctx.update);

    ctx.getChat().then(res => {
        console.log("=========");
        console.log(res);
    });

    // ctx.deleteMessage();
    ctx.deleteMessage();
});

console.log(Telegraf);
// console.log(Telegraf.Telegram.toString());

bot.startPolling();
