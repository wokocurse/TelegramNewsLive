import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { channel, limit = 5 } = req.query;

  if (!channel) {
    return res.status(400).json({ error: 'Missing channel' });
  }

  try {
    const url = `https://t.me/s/${channel}`;
    const html = await fetch(url).then(r => r.text());

    const $ = cheerio.load(html);

    const posts = [];

    $('.tgme_widget_message').each((i, el) => {
      const id = $(el).attr('data-post')?.split('/')[1];

      const text = $(el)
        .find('.tgme_widget_message_text')
        .text()
        .trim();

      const photoStyle = $(el)
        .find('.tgme_widget_message_photo_wrap')
        .attr('style');

      let image = null;
      if (photoStyle) {
        const match = photoStyle.match(/url\('(.*?)'\)/);
        if (match) image = match[1];
      }

      if (id) {
        posts.push({
          id: Number(id),
          text,
          image
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