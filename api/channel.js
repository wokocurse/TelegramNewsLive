import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { channel, limit = 5 } = req.query;

  if (!channel) {
    return res.status(400).json({ error: 'Missing channel' });
  }

  try {
    const url = `https://t.me/s/${channel}`;
    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);

    const posts = [];

        // 👍 reactions
    const reactions = [];
    $(el).find('.tgme_widget_message_reactions span').each((_, r) => {
      reactions.push($(r).text().trim());
    });

    // channel name
    const channelName = $(el)
      .find('.tgme_widget_message_owner_name')
      .text()
      .trim();

    // avatar
    const avatar = $(el)
      .find('.tgme_widget_message_user_photo img')
      .attr('src');

    $('.tgme_widget_message').each((i, el) => {
      const id = $(el).attr('data-post')?.split('/')[1];

      const text = $(el)
        .find('.tgme_widget_message_text')
        .text()
        .trim();

      // 🖼 MULTIPLE IMAGES
      const images = [];
      $(el).find('.tgme_widget_message_photo_wrap').each((_, imgEl) => {
        const style = $(imgEl).attr('style');
        const match = style?.match(/url\('(.*?)'\)/);
        if (match) images.push(match[1]);
      });

      // 👁 VIEWS
      const views = $(el)
        .find('.tgme_widget_message_views')
        .text()
        .trim();

      // 🕒 DATE
      const date = $(el)
        .find('time')
        .attr('datetime');

      if (id) {
        posts.push({
          id: Number(id),
          text,
          images,
          views,
          date,
          reactions,
          channelName,
          avatar,
          link: `https://t.me/${channel}/${id}`
        });
      }
    });

    res.json({
      posts: posts.slice(0, Number(limit))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
}
