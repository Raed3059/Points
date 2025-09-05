import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  PermissionFlagsBits,
  REST,
  Events,
} from "discord.js";
import "dotenv/config";
import fs from "fs";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// أوامر السلاش
const commands = [
  new SlashCommandBuilder()
    .setName("select-channels")
    .setDescription("حدد الرومات من قائمة منسدلة")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("lock-channels")
    .setDescription("يقفل الرومات المحددة")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("unlock-channels")
    .setDescription("يفتح الرومات المحددة")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("delete-channels")
    .setDescription("يحذف الرومات المحددة")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((command) => command.toJSON());

// تحميل القنوات من الملف
function loadChannels() {
  if (fs.existsSync("data.json")) {
    const data = fs.readFileSync("data.json", "utf8");
    return JSON.parse(data);
  }
  return [];
}

// حفظ القنوات في الملف
function saveChannels(channels) {
  fs.writeFileSync("data.json", JSON.stringify(channels, null, 2));
}

// نخزن القنوات المحددة مؤقتاً
let selectedChannels = loadChannels();

// تسجيل الأوامر
(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("✅ تم رفع الأوامر");
  } catch (err) {
    console.error(err);
  }
})();

client.on(Events.InteractionCreate, async (interaction) => {
  // قائمة اختيار القنوات
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "select-channels") {
      const channels = interaction.guild.channels.cache
        .filter((ch) => ch.type === 0) // فقط النصية
        .map((ch) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(ch.name)
            .setValue(ch.id)
        );

      const menu = new StringSelectMenuBuilder()
        .setCustomId("select_channels")
        .setPlaceholder("اختر الرومات...")
        .setMinValues(1)
        .setMaxValues(channels.length)
        .addOptions(channels);

      const row = new ActionRowBuilder().addComponents(menu);

      await interaction.reply({
        content: "اختر الرومات الي تبي:",
        components: [row],
        ephemeral: true,
      });
    }

    // قفل الرومات
    if (interaction.commandName === "lock-channels") {
      if (selectedChannels.length === 0)
        return interaction.reply({ content: "❌ ما حددت أي روم", ephemeral: true });

      for (const id of selectedChannels) {
        const channel = interaction.guild.channels.cache.get(id);
        if (channel) {
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: false,
          });
        }
      }
      await interaction.reply("✅ تم قفل الرومات المحددة");
    }

    // فتح الرومات
    if (interaction.commandName === "unlock-channels") {
      if (selectedChannels.length === 0)
        return interaction.reply({ content: "❌ ما حددت أي روم", ephemeral: true });

      for (const id of selectedChannels) {
        const channel = interaction.guild.channels.cache.get(id);
        if (channel) {
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: true,
          });
        }
      }
      await interaction.reply("✅ تم فتح الرومات المحددة");
    }

    // حذف الرومات
    if (interaction.commandName === "delete-channels") {
      if (selectedChannels.length === 0)
        return interaction.reply({ content: "❌ ما حددت أي روم", ephemeral: true });

      for (const id of selectedChannels) {
        const channel = interaction.guild.channels.cache.get(id);
        if (channel) await channel.delete();
      }
      selectedChannels = [];
      saveChannels(selectedChannels);
      await interaction.reply("🗑️ تم حذف الرومات المحددة");
    }
  }

  // تخزين اختيار القنوات
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "select_channels") {
      selectedChannels = interaction.values;
      saveChannels(selectedChannels);
      await interaction.reply({
        content: `✅ تم اختيار: ${interaction.values
          .map((id) => `<#${id}>`)
          .join(", ")}`,
        ephemeral: true,
      });
    }
  }
});

client.login(process.env.TOKEN);