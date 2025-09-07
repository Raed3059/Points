const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Events,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ===== تسجيل الأوامر =====
const commands = [
  new SlashCommandBuilder()
    .setName('setmenu')
    .setDescription('إظهار قائمة القوانين والاشتراطات')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ تم رفع الأوامر');
  } catch (error) {
    console.error(error);
  }
})();

// ===== الاحداث =====
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'setmenu') {
      const embed = new EmbedBuilder()
        .setTitle('حي الله من جانا! 👋🏻')
        .setDescription('اكتشف المزيد عن خدماتنا ورؤيتنا من خلال\nالأزرار أدناه،\nحيث يمكنك التعرف على هويتنا, قيمنا، والخدمات الي نقدمها لنساعدك في تحقيق أهدافك الرقمية!')
        .setImage('https://i.top4top.io/p_3537qzeqi0.png')
        .setColor(0x2f3136);

      const button = new ButtonBuilder()
        .setCustomId('rules')
        .setLabel('القوانين والاشتراطات')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📜');

      const row = new ActionRowBuilder().addComponents(button);

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  // ===== زر القوانين =====
  if (interaction.isButton()) {
    if (interaction.customId === 'rules') {
      const embed = new EmbedBuilder()
        .setTitle('القوانين والاشتراطات')
        .setImage('https://j.top4top.io/p_353792lva1.png')
        .setColor(0x5865F2);

      const nextBtn = new ButtonBuilder()
        .setCustomId('next')
        .setLabel('التالي')
        .setStyle(ButtonStyle.Success)
        .setEmoji('➡️');

      const prevBtn = new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('السابق')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️')
        .setDisabled(true);

      const row = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    }

    // ===== زر التالي =====
    if (interaction.customId === 'next') {
      const embed = new EmbedBuilder()
        .setTitle('القوانين والاشتراطات')
        .setImage('https://k.top4top.io/p_3537d1xrw2.png')
        .setColor(0x5865F2);

      const nextBtn = new ButtonBuilder()
        .setCustomId('next')
        .setLabel('التالي')
        .setStyle(ButtonStyle.Success)
        .setEmoji('➡️')
        .setDisabled(true);

      const prevBtn = new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('السابق')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️');

      const row = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

      await interaction.update({ embeds: [embed], components: [row] });
    }

    // ===== زر السابق =====
    if (interaction.customId === 'prev') {
      const embed = new EmbedBuilder()
        .setTitle('القوانين والاشتراطات')
        .setImage('https://j.top4top.io/p_353792lva1.png')
        .setColor(0x5865F2);

      const nextBtn = new ButtonBuilder()
        .setCustomId('next')
        .setLabel('التالي')
        .setStyle(ButtonStyle.Success)
        .setEmoji('➡️');

      const prevBtn = new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('السابق')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️')
        .setDisabled(true);

      const row = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

      await interaction.update({ embeds: [embed], components: [row] });
    }
  }
});

client.login(TOKEN);