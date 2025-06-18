const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');
const toIco = require('to-ico');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toico')
    .setDescription('Convert an image to ICO format')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('Image URL to convert')
        .setRequired(false))
    .addAttachmentOption(option =>
      option.setName('image')
        .setDescription('Image file to convert')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('size')
        .setDescription('ICO size (default: 32)')
        .setRequired(false)
        .addChoices(
          { name: '16x16', value: 16 },
          { name: '32x32', value: 32 },
          { name: '48x48', value: 48 },
          { name: '64x64', value: 64 },
          { name: '128x128', value: 128 },
          { name: '256x256', value: 256 }
        )),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const url = interaction.options.getString('url');
      const attachment = interaction.options.getAttachment('image');
      const size = interaction.options.getInteger('size') || 32;

      let imageBuffer;
      let originalName = 'image';

      // Check if URL or attachment is provided
      if (!url && !attachment) {
        return await interaction.editReply('❌ Please provide either an image URL or upload an image file!');
      }

      // Get image buffer from URL or attachment
      if (url) {
        // Validate URL format
        if (!this.isValidImageUrl(url)) {
          return await interaction.editReply('❌ Please provide a valid image URL (PNG, JPG, JPEG, GIF, WEBP, BMP)!');
        }

        try {
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
              'User-Agent': 'Discord Bot Image Converter'
            }
          });
          imageBuffer = Buffer.from(response.data);
          originalName = path.basename(new URL(url).pathname) || 'image';
        } catch (error) {
          return await interaction.editReply('❌ Failed to download image from URL. Please check if the URL is accessible!');
        }
      } else if (attachment) {
        // Check if attachment is an image
        if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
          return await interaction.editReply('❌ Please upload a valid image file!');
        }

        // Check file size (10MB limit)
        if (attachment.size > 10 * 1024 * 1024) {
          return await interaction.editReply('❌ Image file is too large! Please use an image smaller than 10MB.');
        }

        try {
          const response = await axios.get(attachment.url, {
            responseType: 'arraybuffer',
            timeout: 10000
          });
          imageBuffer = Buffer.from(response.data);
          originalName = attachment.name;
        } catch (error) {
          return await interaction.editReply('❌ Failed to download the attached image!');
        }
      }

      // Process image with Sharp
      const processedBuffer = await sharp(imageBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();

      // Convert to ICO
      const icoBuffer = await toIco([processedBuffer]);

      // Create filename
      const baseName = path.parse(originalName).name;
      const filename = `${baseName}_${size}x${size}.ico`;

      // Create attachment
      const icoAttachment = new AttachmentBuilder(icoBuffer, { name: filename });

      // Send the converted ICO file
      await interaction.editReply({
        content: `✅ Successfully converted to ICO format! (${size}x${size})`,
        files: [icoAttachment]
      });

    } catch (error) {
      console.error('Error converting image:', error);
      await interaction.editReply('❌ An error occurred while converting the image. Please try again!');
    }
  },

  isValidImageUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname.toLowerCase();
      const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

      return validExtensions.some(ext => pathname.endsWith(ext)) ||
        parsedUrl.searchParams.has('format') ||
        parsedUrl.hostname.includes('cdn.discordapp.com') ||
        parsedUrl.hostname.includes('media.discordapp.net');
    } catch {
      return false;
    }
  }
};
