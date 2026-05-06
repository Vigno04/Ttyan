export default {
  async run(context, input) {
    if (input.action === 'download' || input.id === 'download') {
      const ytdlp = await context.modules.get('ttyan.ytdlp');
      context.log('Starting download for ' + input.url);
      const result = await ytdlp.download(input.url);
      return result;
    }
  }
};