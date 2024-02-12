import { db } from '#lostcity/db/query.js';

function getOrdinalNum(value: number) {
    let selector;

    if (value <= 0) {
        selector = 4;
    } else if ((value > 3 && value < 21) || value % 10 > 3) {
        selector = 0;
    } else {
        selector = value % 10;
    }

    return value + ['th', 'st', 'nd', 'rd', ''][selector];
}

function niceDate(date: Date) {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();

    const num = getOrdinalNum(day);
    return `${num} ${month} ${year}`;
}

export default function (f: any, opts: any, next: any) {
    f.get('/', async (req: any, res: any) => {
        if (!req.query.page) {
            req.query.page = 1;
        } else {
            req.query.page = parseInt(req.query.page);
        }

        const { cat, page } = req.query;

        const categories = await db.selectFrom('newspost_category').selectAll().execute();

        let newsposts = db.selectFrom('newspost').orderBy('id desc');

        let category = null;
        if (cat > 0) {
            category = await db.selectFrom('newspost_category').where('id', '=', cat).selectAll().executeTakeFirst();
            newsposts = newsposts.where('category_id', '=', cat);
        }

        const nextPage = await newsposts
            .offset(page * 17)
            .limit(1)
            .select('id')
            .execute();
        const more = nextPage.length > 0;

        if (page > 0) {
            newsposts = newsposts.offset((page - 1) * 17);
        }

        newsposts = newsposts.limit(17);

        return res.view('news/index', {
            category,
            page,
            more,
            categories,
            newsposts: await newsposts.selectAll().execute()
        });
    });

    f.get('/:id', async (req: any, res: any) => {
        const newspost = await db.selectFrom('newspost').where('id', '=', req.params.id).selectAll().executeTakeFirst();
        if (!newspost) {
            return res.redirect(302, '/news');
        }

        const category = await db.selectFrom('newspost_category').where('id', '=', newspost.category_id).selectAll().executeTakeFirst();
        const categories = await db.selectFrom('newspost_category').selectAll().execute();
        const prev = await db.selectFrom('newspost').where('id', '<', req.params.id).where('category_id', '=', newspost.category_id).orderBy('id', 'desc').select('id').executeTakeFirst();
        const next = await db.selectFrom('newspost').where('id', '>', req.params.id).where('category_id', '=', newspost.category_id).orderBy('id', 'asc').select('id').executeTakeFirst();

        return res.view('news/post', {
            newspost,
            category,
            date: niceDate(newspost.date),
            categories,
            prev,
            next
        });
    });

    next();
}
