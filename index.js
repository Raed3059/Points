const { Client, GatewayIntentBits, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const dataPath = './data.json';
let data = JSON.parse(fs.readFileSync(dataPath));

const BOT_NAME = "R∆3D";
const BOT_DESC = "بوت النقاط";

// ===== البيئة =====
const TOKEN = process.env.TOKEN;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const OWNER_ID = process.env.OWNER_ID;

function saveData() { fs.writeFileSync(dataPath, JSON.stringify(data, null, 2)); }

// عند تشغيل البوت
client.once('ready', async () => {
    console.log(`${BOT_NAME} جاهز!`);
    const guild = client.guilds.cache.first();
    await guild.commands.create(new SlashCommandBuilder().setName('menu').setDescription('فتح القائمة الرئيسية'));
});

// مراقبة الرسائل لإضافة النقاط تلقائيًا
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const userId = message.author.id;
    if (!data.users[userId]) data.users[userId] = { points: 0, messageCount: 0 };

    data.users[userId].messageCount++;
    if (data.users[userId].messageCount >= data.settings.messagesThreshold) {
        data.users[userId].points += data.settings.pointsPerThreshold;
        data.users[userId].messageCount = 0;
        saveData();

        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
        if(logChannel){
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('تم إضافة نقاط!')
                .setThumbnail(message.guild.iconURL())
                .addFields(
                    {name:'العضو', value:`<@${userId}>`, inline:true},
                    {name:'يوزره', value: `${message.author.username}`, inline:true},
                    {name:'النقاط المكتسبة', value:`${data.settings.pointsPerThreshold}`, inline:true},
                    {name:'إجمالي النقاط', value:`${data.users[userId].points}`, inline:true}
                )
                .setFooter({text: BOT_NAME, iconURL: client.user.avatarURL()})
                .setTimestamp();

            logChannel.send({embeds:[embed]});
        }
    }
});

// أمر /menu
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

    const userId = interaction.user.id;
    if (!data.users[userId]) data.users[userId] = { points: 0, messageCount: 0 };
    const isOwner = userId === OWNER_ID;
    const isAdmin = interaction.member.permissions.has("Administrator");

    // ===== /menu =====
    if (interaction.isChatInputCommand() && interaction.commandName === 'menu') {
        if (!isOwner && !isAdmin) { // الأعضاء العاديين
            const menu = new StringSelectMenuBuilder()
                .setCustomId('menu_select')
                .setPlaceholder('اختر خيار من القائمة')
                .addOptions([
                    { label: 'عرض نقاطي', value: 'my_points' },
                    { label: 'التوب', value: 'top_users' },
                    { label: 'تحويل النقاط للترقية', value: 'convert_upgrade' },
                    { label: 'تحويل النقاط للكريدت', value: 'convert_credit' }
                ]);
            const row = new ActionRowBuilder().addComponents(menu);
            await interaction.reply({ content: `**${BOT_NAME}**\n${BOT_DESC}`, components: [row], ephemeral: true });
            return;
        }

        if (!isOwner) return interaction.reply({ content: 'هذا الأمر محجوز لمالك السيرفر فقط.', ephemeral: true });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('menu_select')
            .setPlaceholder('اختر خيار من القائمة')
            .addOptions([
                { label: 'تغيير النقاط لكل X رسائل', value: 'add_points' },
                { label: 'تغيير عدد الرسائل المطلوب', value: 'add_msgs' },
                { label: 'تغيير الحد الأدنى للتحويل', value: 'change_min' },
                { label: 'عرض الأعضاء والنقاط', value: 'view_users' },
                { label: 'تصفير النقاط', value: 'reset_points' },
                { label: 'طلبات الترقيه', value: 'upgrade_requests' },
                { label: 'طلبات الكريدت', value: 'credit_requests' }
            ]);
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: `**${BOT_NAME}**\n${BOT_DESC}`, components: [row], ephemeral: true });
    }

    // ===== القوائم المنسدلة =====
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_select'){
        const option = interaction.values[0];
        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);

        if (!isOwner) {
            switch(option){
                case 'my_points':
                    await interaction.reply({ content: `نقاطك الحالية: ${data.users[userId].points}`, ephemeral:true });
                    break;
                case 'top_users':
                    const top = Object.entries(data.users)
                        .sort((a,b)=>b[1].points - a[1].points)
                        .slice(0,10)
                        .map(([id,u],idx)=>`${idx+1}. <@${id}> - ${u.points} نقاط`)
                        .join('\n') || "لا يوجد أعضاء";
                    await interaction.reply({ content: `**التوب:**\n${top}`, ephemeral:true });
                    break;
                case 'convert_upgrade':
                    if(!isAdmin){ interaction.reply({content:'يجب أن تكون إداري لتحويل النقاط للترقية', ephemeral:true}); return; }
                    if(data.users[userId].points < data.settings.minPointsToConvert){
                        interaction.reply({content:`الحد الأدنى للتحويل: ${data.settings.minPointsToConvert} نقاط`, ephemeral:true});
                    } else {
                        data.upgradeRequests[userId]=data.users[userId].points;
                        const pts = data.users[userId].points;
                        data.users[userId].points=0;
                        saveData();
                        interaction.reply({content:'تم تحويل نقاطك للترقية! افتح تذكرة للاستلام', ephemeral:true});
                        if(logChannel) logChannel.send(`<@${userId}> حول نقاطه للترقية: ${pts}`);
                    }
                    break;
                case 'convert_credit':
                    if(data.users[userId].points < data.settings.minPointsToConvert){
                        interaction.reply({content:`الحد الأدنى للتحويل: ${data.settings.minPointsToConvert} نقاط`, ephemeral:true});
                    } else {
                        data.creditRequests[userId]=data.users[userId].points;
                        const pts=data.users[userId].points;
                        data.users[userId].points=0;
                        saveData();
                        interaction.reply({content:'تم تحويل نقاطك للكريدت! افتح تذكرة للاستلام', ephemeral:true});
                        if(logChannel) logChannel.send(`<@${userId}> حول نقاطه للكريدت: ${pts}`);
                    }
                    break;
            }
            return;
        }

        // ===== خيارات المالك =====
        let modal, inputField;
        if(option==='add_points'){
            modal=new ModalBuilder().setCustomId('modal_change_points').setTitle('تغيير النقاط لكل X رسائل');
            inputField=new TextInputBuilder().setCustomId('new_points').setLabel(`النقاط الحالية: ${data.settings.pointsPerThreshold}`).setStyle(TextInputStyle.Short).setRequired(true);
        }
        if(option==='add_msgs'){
            modal=new ModalBuilder().setCustomId('modal_change_messages').setTitle('تغيير عدد الرسائل المطلوب');
            inputField=new TextInputBuilder().setCustomId('new_messages').setLabel(`العدد الحالي: ${data.settings.messagesThreshold}`).setStyle(TextInputStyle.Short).setRequired(true);
        }
        if(option==='change_min'){
            modal=new ModalBuilder().setCustomId('modal_change_min').setTitle('تغيير الحد الأدنى للتحويل');
            inputField=new TextInputBuilder().setCustomId('new_min').setLabel(`الحد الأدنى الحالي: ${data.settings.minPointsToConvert}`).setStyle(TextInputStyle.Short).setRequired(true);
        }
        if(modal && inputField){
            modal.addComponents(new ActionRowBuilder().addComponents(inputField));
            await interaction.showModal(modal);
        }

        // باقي خيارات المالك مثل view_users, reset_points, upgrade_requests, credit_requests
        switch(option){
            case 'view_users':
                const list = Object.entries(data.users).sort((a,b)=>b[1].points - a[1].points)
                    .map(([id,u],idx)=>`${idx+1}. <@${id}> - ${u.points} نقاط`).join('\n') || "لا يوجد أعضاء";
                interaction.reply({content:`**الأعضاء والنقاط:**\n${list}`, ephemeral:true});
                break;
            case 'reset_points':
                Object.values(data.users).forEach(u=>u.points=0);
                saveData();
                if(logChannel) logChannel.send(`تم تصفير نقاط جميع الأعضاء بواسطة ${interaction.user.tag}`);
                interaction.reply({content:'تم تصفير نقاط جميع الأعضاء!', ephemeral:true});
                break;
            case 'upgrade_requests':
                const upgrades = Object.entries(data.upgradeRequests).map(([id,pts])=>`${pts} نقاط - <@${id}>`).join('\n') || "لا يوجد طلبات";
                interaction.reply({content:`**طلبات الترقيه:**\n${upgrades}`, ephemeral:true});
                break;
            case 'credit_requests':
                const credits = Object.entries(data.creditRequests).map(([id,pts])=>`${pts} نقاط - <@${id}>`).join('\n') || "لا يوجد طلبات";
                interaction.reply({content:`**طلبات الكريدت:**\n${credits}`, ephemeral:true});
                break;
        }
    }

    // ===== التعامل مع المودالات =====
    if(interaction.isModalSubmit()){
        if(interaction.customId==='modal_change_points'){
            const newPoints=parseInt(interaction.fields.getTextInputValue('new_points'));
            if(isNaN(newPoints)||newPoints<=0) return interaction.reply({content:'أدخل قيمة صحيحة أكبر من 0', ephemeral:true});
            data.settings.pointsPerThreshold=newPoints; saveData();
            return interaction.reply({content:`تم تحديث النقاط لكل X رسائل إلى ${newPoints}`, ephemeral:true});
        }
        if(interaction.customId==='modal_change_messages'){
            const newMsgs=parseInt(interaction.fields.getTextInputValue('new_messages'));
            if(isNaN(newMsgs)||newMsgs<=0) return interaction.reply({content:'أدخل عدد صحيح أكبر من 0', ephemeral:true});
            data.settings.messagesThreshold=newMsgs; saveData();
            return interaction.reply({content:`تم تحديث عدد الرسائل المطلوبة إلى ${newMsgs}`, ephemeral:true});
        }
        if(interaction.customId==='modal_change_min'){
            const newMin=parseInt(interaction.fields.getTextInputValue('new_min'));
            if(isNaN(newMin)||newMin<=0) return interaction.reply({content:'أدخل قيمة صحيحة أكبر من 0', ephemeral:true});
            data.settings.minPointsToConvert=newMin; saveData();
            return interaction.reply({content:`تم تحديث الحد الأدنى للتحويل إلى ${newMin}`, ephemeral:true});
        }
    }
});

client.login(TOKEN);