require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRow } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const dataPath = './data.json';
let data = JSON.parse(fs.readFileSync(dataPath));

const BOT_NAME = "BestOption Bot";
const BOT_DESC = "بوت إدارة النقاط والتحويلات";

function saveData() {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const MIN_POINTS = parseInt(process.env.MIN_POINTS) || 10;
const MESSAGE_THRESHOLD = 5; // بعد كم رسالة يعطي نقاط
const POINTS_PER_THRESHOLD = 5; // عدد النقاط لكل threshold

// عند تشغيل البوت
client.once('ready', async () => {
    console.log(`${BOT_NAME} جاهز!`);

    // تسجيل أمر /menu
    const guild = client.guilds.cache.first();
    await guild.commands.create(new SlashCommandBuilder().setName('menu').setDescription('فتح القائمة الرئيسية'));
});

// مراقبة الرسائل لإضافة النقاط تلقائيًا
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const userId = message.author.id;
    if (!data.users[userId]) data.users[userId] = { points: 0, messageCount: 0 };

    data.users[userId].messageCount++;
    if (data.users[userId].messageCount >= MESSAGE_THRESHOLD) {
        data.users[userId].points += POINTS_PER_THRESHOLD;
        data.users[userId].messageCount = 0;
        saveData();

        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
        if(logChannel) logChannel.send(`<@${userId}> حصل على ${POINTS_PER_THRESHOLD} نقاط! مجموع نقاطه: ${data.users[userId].points}`);
    }
});

// أمر /menu
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

    const userId = interaction.user.id;
    if (!data.users[userId]) data.users[userId] = { points: 0, messageCount: 0 };

    const isOwner = interaction.user.id === interaction.guild.ownerId;
    const isAdmin = interaction.member.permissions.has("Administrator");

    // ==== /menu للأمر ====
    if (interaction.isChatInputCommand() && interaction.commandName === 'menu') {
        const menu = new StringSelectMenuBuilder()
            .setCustomId('menu_select')
            .setPlaceholder('اختر خيار من القائمة');

        if (isOwner) {
            menu.addOptions([
                { label: 'إضافة نقاط', value: 'add_points' },
                { label: 'إضافة رسائل', value: 'add_msgs' },
                { label: 'تغيير الحد الأدنى للتحويل', value: 'change_min' },
                { label: 'عرض الأعضاء والنقاط', value: 'view_users' },
                { label: 'تصفير النقاط', value: 'reset_points' },
                { label: 'طلبات الترقيه', value: 'upgrade_requests' },
                { label: 'طلبات كريدت', value: 'credit_requests' }
            ]);
        } else {
            menu.addOptions([
                { label: 'عرض نقاطي', value: 'my_points' },
                { label: 'التوب', value: 'top_users' },
                { label: 'تحويل النقاط للترقية', value: 'convert_upgrade' },
                { label: 'تحويل النقاط للكريدت', value: 'convert_credit' }
            ]);
        }

        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: `**${BOT_NAME}**\n${BOT_DESC}`, components: [row], ephemeral: true });
        return;
    }

    // ==== القوائم المنسدلة ====
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_select') {
        const option = interaction.values[0];
        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);

        // ===== الأعضاء والإداريين =====
        if (!isOwner) {
            switch(option) {
                case 'my_points':
                    await interaction.reply({ content: `نقاطك الحالية: ${data.users[userId].points}`, ephemeral: true });
                    break;
                case 'top_users':
                    const top = Object.entries(data.users)
                        .sort((a,b) => b[1].points - a[1].points)
                        .slice(0, 10)
                        .map(([id, u], idx) => `${idx+1}. <@${id}> - ${u.points} نقاط`)
                        .join('\n') || "لا يوجد أعضاء";
                    await interaction.reply({ content: `**التوب:**\n${top}`, ephemeral: true });
                    break;
                case 'convert_upgrade':
                    if(data.users[userId].points < MIN_POINTS){
                        await interaction.reply({ content: `الحد الأدنى للتحويل: ${MIN_POINTS} نقاط`, ephemeral: true });
                    } else {
                        data.upgradeRequests[userId] = data.users[userId].points;
                        const pointsConverted = data.users[userId].points;
                        data.users[userId].points = 0;
                        saveData();
                        await interaction.reply({ content: `تم تحويل نقاطك للترقية! افتح تذكرة للاستلام`, ephemeral: true });
                        if(logChannel) logChannel.send(`<@${userId}> حول نقاطه للترقية: ${pointsConverted} نقاط`);
                    }
                    break;
                case 'convert_credit':
                    if(data.users[userId].points < MIN_POINTS){
                        await interaction.reply({ content: `الحد الأدنى للتحويل: ${MIN_POINTS} نقاط`, ephemeral: true });
                    } else {
                        data.creditRequests[userId] = data.users[userId].points;
                        const pointsConverted = data.users[userId].points;
                        data.users[userId].points = 0;
                        saveData();
                        await interaction.reply({ content: `تم تحويل نقاطك للكريدت! افتح تذكرة للاستلام`, ephemeral: true });
                        if(logChannel) logChannel.send(`<@${userId}> حول نقاطه للكريدت: ${pointsConverted} نقاط`);
                    }
                    break;
                default:
                    await interaction.reply({ content: `الخيار غير معروف`, ephemeral: true });
                    break;
            }
        }

        // ===== للمالك =====
        if (isOwner) {
            switch(option) {
                case 'add_points':
                    // فتح مودال لإدخال العضو وعدد النقاط
                    const modal = new ModalBuilder()
                        .setCustomId('modal_add_points')
                        .setTitle('إضافة نقاط');

                    const inputUser = new TextInputBuilder()
                        .setCustomId('target_user')
                        .setLabel('ايدي العضو أو منشن')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    const inputPoints = new TextInputBuilder()
                        .setCustomId('points_amount')
                        .setLabel('عدد النقاط')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    modal.addComponents(new ActionRow().addComponents(inputUser));
                    modal.addComponents(new ActionRow().addComponents(inputPoints));

                    await interaction.showModal(modal);
                    break;

                case 'add_msgs':
                    await interaction.reply({ content: `خاصية إضافة الرسائل لتحديد نقاط لكل X رسائل جاهزة مسبقاً`, ephemeral: true });
                    break;

                case 'change_min':
                    await interaction.reply({ content: `لتغيير الحد الأدنى للتحويل، عدل قيمة MIN_POINTS في .env` , ephemeral:true });
                    break;

                case 'view_users':
                    const list = Object.entries(data.users)
                        .sort((a,b) => b[1].points - a[1].points)
                        .map(([id,u],idx)=>`${idx+1}. <@${id}> - ${u.points} نقاط`)
                        .join('\n') || "لا يوجد أعضاء";
                    await interaction.reply({ content: `**الأعضاء والنقاط:**\n${list}`, ephemeral: true });
                    break;

                case 'reset_points':
                    Object.values(data.users).forEach(u => u.points = 0);
                    saveData();
                    if(logChannel) logChannel.send(`تم تصفير نقاط جميع الأعضاء بواسطة ${interaction.user.tag}`);
                    await interaction.reply({ content: `تم تصفير نقاط جميع الأعضاء!`, ephemeral: true });
                    break;

                case 'upgrade_requests':
                    const upgrades = Object.entries(data.upgradeRequests).map(([id,pts])=>`${pts} نقاط - <@${id}>`).join('\n') || "لا يوجد طلبات";
                    await interaction.reply({ content: `**طلبات الترقيه:**\n${upgrades}`, ephemeral: true });
                    break;

                case 'credit_requests':
                    const credits = Object.entries(data.creditRequests).map(([id,pts])=>`${pts} نقاط - <@${id}>`).join('\n') || "لا يوجد طلبات";
                    await interaction.reply({ content: `**طلبات الكريدت:**\n${credits}`, ephemeral: true });
                    break;

                default:
                    await interaction.reply({ content: `الخيار غير معروف`, ephemeral: true });
                    break;
            }
        }
    }

    // ===== مودال إضافة النقاط للمالك =====
    if(interaction.isModalSubmit() && interaction.customId === 'modal_add_points'){
        const target = interaction.fields.getTextInputValue('target_user');
        const points = parseInt(interaction.fields.getTextInputValue('points_amount'));
        if(isNaN(points)){
            await interaction.reply({ content: `الرجاء إدخال رقم صحيح للنقاط!`, ephemeral: true });
            return;
        }

        let targetId;
        if(target.match(/^<@!?(\d+)>$/)){
            targetId = target.replace(/\D/g,'');
        } else {
            targetId = target;
        }

        if(!data.users[targetId]) data.users[targetId] = { points:0, messageCount:0 };
        data.users[targetId].points += points;
        saveData();

        await interaction.reply({ content: `تم إعطاء <@${targetId}> ${points} نقاط!`, ephemeral: true });
        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
        if(logChannel) logChannel.send(`<@${targetId}> حصل على ${points} نقاط بواسطة ${interaction.user.tag}. مجموع نقاطه: ${data.users[targetId].points}`);
    }

});

client.login(process.env.TOKEN);