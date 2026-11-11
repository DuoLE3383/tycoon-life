// Client-side "life oracle": used on GitHub Pages where there is no server
// for /api/story. Generates era-aware twists without repeating recent ones.
// When the app is self-hosted (npm run dev / start), the real LLM endpoint
// answers first and this module is only a fallback.
//
// v10.4: events are now categorised into four kinds. `askAI` randomly picks
// a kind weighted by life-stage context (rich players get more lifestage
// pivots, struggling players get more badluck/luck swings). The LLM prompt
// on /api/story also receives the chosen kind so the backend stays aligned.
//
// v11.8: every template is now localised into EN / VI / ZH. The `make()`
// function receives the player's UI language and returns the matching strings,
// so the fallback path no longer shows English-only boxes to VI/ZH players.
// Dedup still uses the canonical English title (backward compatible with
// existing saves, which stored English titles throughout v10–v11.7).
import type { AIEvent, AIEventKind } from './engine';
import type { Lang } from './i18n';

// Localised string triple: [English, Tiếng Việt, 简体中文].
type L3 = readonly [string, string, string];
const tr = (l: L3, lang: Lang): string => (lang === 'vi' ? l[1] : lang === 'zh' ? l[2] : l[0]);

interface Snap {
  name?: string; age?: number; year?: number; era?: string; nation?: string;
  money?: number; netWorth?: number; job?: string | null; businesses?: string[];
  space?: string[]; family?: string; fame?: number; level?: number; followers?: number;
  studying?: string[]; health?: number; spirit?: number;
}

type Tpl = {
  kind: AIEventKind;
  make: (c: Ctx, lang: Lang) => Omit<AIEvent, 'source'>;
};
interface Ctx { y: number; era: string; rich: boolean; biz: string; snap: Snap }

// Weighting for kind selection. The caller can pass an explicit kind (e.g.
// when the LLM picks one) — otherwise we sample using these probabilities,
// modified slightly by the player's situation so the events feel relevant.
export function pickKind(snap: Snap): AIEventKind {
  const rich = (snap.netWorth || 0) > 1e6;
  const hasBiz = (snap.businesses?.length || 0) > 0;
  const isStudying = (snap.studying?.length || 0) > 0;
  // base weights
  const w: Record<AIEventKind, number> = { story: 30, luck: 25, badluck: 22, lifestage: 23 };
  if (rich) { w.lifestage += 8; w.story -= 4; }
  if (hasBiz) { w.lifestage += 6; w.badluck += 3; }
  if (isStudying) { w.lifestage += 6; }
  if ((snap.money || 0) < 0) { w.luck += 6; w.badluck += 4; w.story -= 4; }
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const k of Object.keys(w) as AIEventKind[]) {
    r -= w[k];
    if (r <= 0) return k;
  }
  return 'story';
}

const TEMPLATES: Tpl[] = [
  // =================== story — open-ended life twists ===================
  {
    kind: 'story',
    make: ({ y, era, biz, rich }, lang) => ({
      title: tr([`A ${y} kind of offer`, `Một lời đề nghị kiểu ${y}`, `${y} 年式的提议`], lang),
      text: biz
        ? tr([
            `A headhunter slides you a contract across the table. "The ${era} won't wait," she says. Your rivals at ${biz} would kill for this.`,
            `Một headhunter đẩy bản hợp đồng qua bàn. "Thời đại ${era} không chờ ai," cô ấy nói. Đối thủ ở ${biz} khao khát cơ hội này.`,
            `猎头把合同推过桌面。"${era} 时代不等人，"她说。你在 ${biz} 的对手为这个机会垂涎三尺。`
          ], lang)
        : tr([
            `A headhunter slides you a contract across the table. "The ${era} won't wait," she says. Your rivals would kill for this.`,
            `Một headhunter đẩy bản hợp đồng qua bàn. "Thời đại ${era} không chờ ai," cô ấy nói. Đối thủ của bạn khao khát cơ hội này.`,
            `猎头把合同推过桌面。"${era} 时代不等人，"她说。你的对手为这个机会垂涎三尺。`
          ], lang),
      choices: [
        { l: tr(['Sign it', 'Ký ngay', '签字'], lang), money: rich ? 120000 : 15000, fame: 2, out: tr(['You signed. The move pays off within months.', 'Bạn ký. Bước đi này sinh lời chỉ trong vài tháng.', '你签了。几个月内就见效。'], lang) },
        { l: tr(['Counter hard', 'Trả giá lại', '强硬还价'], lang), money: rich ? 40000 : 5000, out: tr(['They meet you halfway. Respect earned.', 'Họ nhường bạn nửa chừng. Sự nể trọng được ghi nhận.', '对方各退一步。敬意到手。'], lang) },
        { l: tr(['Stay loyal', 'Trung thành', '保持忠诚'], lang), fame: 1, out: tr(['You stay. Loyalty is its own quiet currency.', 'Bạn ở lại. Lòng trung thành là loại tiền tệ yên lặng của riêng nó.', '你留下。忠诚本身就是一种安静的货币。'], lang) }
      ]
    })
  },
  {
    kind: 'story',
    make: ({ snap }, lang) => ({
      title: tr(['A letter from home', 'Một thư từ nhà', '一封家书'], lang),
      text: snap.family
        ? tr([
            `Your family writes: an old property needs repairs before the rainy season. They ask how you are doing, too.`,
            `Gia đình bạn viết: một căn nhà cũ cần sửa trước mùa mưa. Họ cũng hỏi thăm bạn.`,
            `家里来信：一处老房子雨季前要修缮。他们也问起你的近况。`
          ], lang)
        : tr([
            `Your family writes: an old property needs repairs before the rainy season. They miss you.`,
            `Gia đình bạn viết: một căn nhà cũ cần sửa trước mùa mưa. Họ nhớ bạn.`,
            `家里来信：一处老房子雨季前要修缮。他们想你。`
          ], lang),
      choices: [
        { l: tr(['Send more than they asked', 'Gửi nhiều hơn yêu cầu', '多寄一些'], lang), cost: 8000, fame: 2, out: tr(['The house is fixed. Your name is said with pride at dinner.', 'Nhà được sửa xong. Tên bạn được nhắc với tự hào trong bữa tối.', '房子修好了。饭桌上提到你的名字带着骄傲。'], lang) },
        { l: tr(['Send exactly what is needed', 'Gửi đúng số cần', '寄足所需'], lang), cost: 3000, out: tr(['Practical, thoughtful, done.', 'Thực tế, chu đáo, xong.', '实际、周到、搞定。'], lang) },
        { l: tr(['Promise to visit instead', 'Hứa về thăm', '改承诺回家'], lang), out: tr(['You book the trip. Somehow that matters more.', 'Bạn đặt vé. Tự nhiên điều đó quan trọng hơn.', '你订了行程。这反而更有分量。'], lang) }
      ]
    })
  },
  {
    kind: 'story',
    make: ({ snap }, lang) => ({
      title: snap.followers && snap.followers > 50000
        ? tr(['Trending, again', 'Lại hot', '又火了'], lang)
        : tr(['A journalist calls', 'Một nhà báo gọi', '记者来电'], lang),
      text: tr([
        `A reporter is writing a profile: "The ${snap.nation || 'local'} tycoon nobody can figure out." The interview airs Sunday.`,
        `Một nhà báo đang viết bài chân dung: "Ông trùm ${snap.nation || 'địa phương'} mà không ai hiểu nổi." Phỏng vấn phát sóng Chủ nhật.`,
        `一位记者在写人物专访："那位谁都看不透的${snap.nation || '本地'}大亨。"采访周日播出。`
      ], lang),
      choices: [
        { l: tr(['Open the books', 'Mở sổ sách', '公开账本'], lang), fame: 4, out: tr(['Transparency wins the front page. The gossip dies.', 'Minh bạch chiếm trang nhất. Tiếng đồn tan biến.', '透明登上头版。流言消散。'], lang) },
        { l: tr(['Charm them, reveal nothing', 'Duyên dáng, không tiết lộ', '施展魅力，滴水不漏'], lang), fame: 1, out: tr(['The piece is flattering and completely uninformative.', 'Bài viết tâng bốc mà hoàn toàn không có thông tin.', '文章吹捧一番，信息量为零。'], lang) },
        { l: tr(['Decline politely', 'Lịch sự từ chối', '礼貌拒绝'], lang), fame: -1, out: tr(['The story runs without you. It stings a little.', 'Bài viết đăng không có bạn. Hơi đau đớn một chút.', '报道照登，只是没你。有点扎心。'], lang) }
      ]
    })
  },
  {
    kind: 'story',
    make: ({ biz }, lang) => ({
      title: tr(['Dinner with your rival', 'Bữa tối với đối thủ', '与对手共进晚餐'], lang),
      text: biz
        ? tr([
            `Your biggest competitor in ${biz} invites you to dinner. The wine is expensive and the smiles are measured.`,
            `Đối thủ lớn nhất ở ${biz} mời bạn ăn tối. Rượu đắt tiền, nụ cười được đo đếm.`,
            `你在 ${biz} 最大的对手请你吃饭。酒贵，笑容都量过分寸。`
          ], lang)
        : tr([
            `Your biggest competitor invites you to dinner. The wine is expensive and the smiles are measured.`,
            `Đối thủ lớn nhất mời bạn ăn tối. Rượu đắt tiền, nụ cười được đo đếm.`,
            `你最大的对手请你吃饭。酒贵，笑容都量过分寸。`
          ], lang),
      choices: [
        { l: tr(['Propose a merger', 'Đề nghị sáp nhập', '提议合并'], lang), cost: 25000, money: 90000, out: tr(['The handshake makes the papers. The empire grows.', `Cái bắt tay lên báo. Đế chế lớn mạnh.`, '握手登上头条。帝国扩张。'], lang) },
        { l: tr(['Listen, agree to nothing', 'Lắng nghe, không hứa', '只听不允'], lang), out: tr(['You leave with intel worth more than the meal.', 'Bạn rời đi với thông tin đáng giá hơn bữa ăn.', '你离席时带走的情报比那顿饭值钱。'], lang) },
        { l: tr(['Insult their pricing', 'Chê giá của họ', '嘲讽定价'], lang), fame: -2, money: 0, out: tr(['The tab is yours. The grudge is theirs.', 'Tiền bữa là của bạn. Thù oán là của họ.', '账单归你。仇恨归他们。'], lang) }
      ]
    })
  },
  {
    kind: 'story',
    make: ({ snap }, lang) => ({
      title: tr(['Two tickets, one weekend', 'Hai vé, một cuối tuần', '两张票，一个周末'], lang),
      text: snap.family && snap.family !== 'single'
        ? tr([
            `Someone from the ${snap.nation || 'city'} arts gala slips you two tickets with a handwritten note. Your calendar, however, says board meeting.`,
            `Ai đó từ đêm gala nghệ thuật ${snap.nation || 'thành phố'} lén đưa bạn hai vé kèm tờ giấy viết tay. Lịch của bạn, tuy vậy, ghi họp hội đồng.`,
            `${snap.nation || '城里'}艺术晚宴的人塞给你两张票，附手写便条。然而你的日程写着开董事会。`
          ], lang)
        : tr([
            `Someone from the ${snap.nation || 'city'} arts gala slips you two tickets with a handwritten note. Your calendar says nothing at all.`,
            `Ai đó từ đêm gala nghệ thuật ${snap.nation || 'thành phố'} lén đưa bạn hai vé kèm tờ giấy viết tay. Lịch bạn trống rỗng.`,
            `${snap.nation || '城里'}艺术晚宴的人塞给你两张票，附手写便条。你的日程一片空白。`
          ], lang),
      choices: [
        { l: tr(['Go. Work can wait.', 'Đi. Việc để sau.', '去吧。工作等着。'], lang), out: tr(['You dance badly and laugh a lot. A good trade.', 'Bạn khiêu vũ tệ và cười nhiều. Một đổi chác tốt.', '你跳得烂，笑得欢。划算。'], lang) },
        { l: tr(['Send an assistant with flowers', 'Gửi trợ lý kèm hoa', '让助理带花去'], lang), fame: 1, out: tr(['Graceful, if a little safe.', 'Thanh lịch, dù hơi an toàn.', '得体，只是略保守。'], lang) },
        { l: tr(['Frame the note in your office', 'Đóng khung tờ giấy ở văn phòng', '把便条裱进办公室'], lang), out: tr(['It becomes a small legend among your staff.', 'Nó thành một truyền miệng nhỏ trong nhân viên.', '它成了员工间的小传奇。'], lang) }
      ]
    })
  },
  {
    kind: 'story',
    make: (_ctx, lang) => ({
      title: tr(['The debtor in the lobby', 'Người nợ nợ trong sảnh', '大堂里的债主'], lang),
      text: tr([
        'An old man waits in your lobby with a 30-year-old IOU signed by your father. He asks for almost nothing.',
        'Một ông già đợi trong sảnh với tờ khất 30 năm do cha bạn ký. Ông ấy gần như không đòi gì.',
        '一位老人在你公司大堂等着，手里拿着你父亲 30 年前签的欠条。他几乎不要什么。'
      ], lang),
      choices: [
        { l: tr(['Pay tenfold', 'Trả gấp mười', '十倍偿还'], lang), cost: 10000, fame: 4, out: tr(['The old man weeps. Your staff retell the story for a decade.', 'Ông già khóc. Nhân viên bạn kể lại câu chuyện suốt mười năm.', '老人落泪。你的员工把这事讲了十年。'], lang) },
        { l: tr(['Pay exactly, with interest', 'Trả đúng, cộng lãi', '按本息还足'], lang), cost: 3000, out: tr(['Clean and correct. He bows twice.', 'Sạch sẽ, đàng hoàng. Ông ấy cúi hai lần.', '干净利落。他鞠了两次躬。'], lang) },
        { l: tr(['Hire him instead', 'Thuê ông ấy', '改雇用他'], lang), money: 0, out: tr(['He ran warehouses for you for twenty years. Best hire ever.', 'Ông ấy quản kho cho bạn suốt 20 năm. Lần thuê xuất sắc nhất.', '他为你管了二十年仓库。最棒的一次雇用。'], lang) }
      ]
    })
  },
  // =================== luck — windfall / good fortune ===================
  {
    kind: 'luck',
    make: ({ rich }, lang) => ({
      title: tr(['An envelope with no sender', 'Phong bì không người gửi', '无寄件人的信封'], lang),
      text: tr([
        'A thick envelope arrives at your office. No name, no note — except three words: "You deserve this."',
        'Một phong bì dày đến văn phòng bạn. Không tên, không ghi chú — chỉ ba từ: "Bạn xứng đáng."',
        '一个厚信封寄到你办公室。没名没注 — 只有三个字："你值得。"'
      ], lang),
      choices: [
        { l: tr(['Keep it', 'Giữ lại', '留下'], lang), money: rich ? 60000 : 9000, out: tr(['You keep it. Some mysteries are gifts.', 'Bạn giữ. Có điều huyền bí là quà.', '你留下了。有些谜就是礼物。'], lang) },
        { l: tr(['Give it away', 'Cho đi', '捐出去'], lang), fame: 5, out: tr(['The shelter puts your name on the wall. You feel taller.', 'Trại trợ giúp khắc tên bạn lên tường. Bạn thấy mình cao hơn.', '收容所把你的名字刻上墙。你感觉自己变高了。'], lang) },
        { l: tr(['Try to find the sender', 'Tìm người gửi', '找出寄件人'], lang), cost: 2000, money: 12000, out: tr(['You find them: a retired teacher you helped years ago. She insists you keep it — with interest.', 'Bạn tìm ra: một giáo viên nghỉ hưu bạn giúp vài năm trước. Bà ấy ép bạn giữ — cộng lãi.', '你找到了：多年前你帮过的一位退休教师。她坚持让你收下 — 还带利息。'], lang) }
      ]
    })
  },
  {
    kind: 'luck',
    make: ({ rich }, lang) => ({
      title: tr(['The lucky draw', 'Xổ số may mắn', '幸运抽奖'], lang),
      text: tr([
        'A charity gala raffle ticket you forgot you bought wins the grand prize. The crowd claps; a banker hands you the envelope with a knowing smile.',
        'Vé raffle từ thiện bạn quên mình mua trúng giải đặc biệt. Đám đông vỗ tay; một banker đưa bạn phong bì với nụ cười hiểu ý.',
        '你不记得买过的慈善晚宴抽奖券中了头奖。人群鼓掌；一位银行家意味深长地笑着把信封递给你。'
      ], lang),
      choices: [
        { l: tr(['Take the cash', 'Lấy tiền mặt', '拿现金'], lang), money: rich ? 90000 : 22000, fame: 1, out: tr(['You take the cheque. The banker introduces you to her boss.', 'Bạn nhận séc. Banker giới thiệu bạn với sếp cô ấy.', '你接过支票。银行家把你介绍给她的上司。'], lang) },
        { l: tr(['Donate it back', 'Quyên góp lại', '回捐出去'], lang), cost: 0, fame: 6, out: tr(['The charity makes you a patron. Worth ten times the press.', 'Tổ chức từ thiện phong bạn nhà bảo trợ. Giá gấp mười lần báo chí.', '慈善机构封你为赞助人。价值十倍于见报。'], lang) },
        { l: tr(['Bet it on the index', 'Cược vào chứng khoán', '投到指数上'], lang), cost: 0, money: rich ? 140000 : 33000, out: tr(['You buy an index fund on Monday. By Friday it ticks up.', 'Bạn mua quỹ chỉ số thứ Hai. Đến thứ Sáu nó nhích lên.', '你周一买入指数基金。周五小幅上涨。'], lang) }
      ]
    })
  },
  {
    kind: 'luck',
    make: ({ y }, lang) => ({
      title: tr(['The inheritance', 'Khối di sản', '遗产'], lang),
      text: tr([
        `A notary in ${y} informs you that a great-uncle you never met has passed and left you his estate. The lawyer is apologetic about the surprise.`,
        `Một công chứng viên ở ${y} báo bạn một bác họ xa chưa từng gặp đã mất, để lại khối di sản. Luật sư xin lỗi vì sự bất ngờ.`,
        `${y} 年一位公证员通知你：你从未谋面的伯祖祖父去世，把庄园留给了你。律师为这突如其来的消息致歉。`
      ], lang),
      choices: [
        { l: tr(['Accept the estate', 'Nhận di sản', '接受庄园'], lang), money: 130000, fame: 2, out: tr(['A vineyard, a townhouse, and a wine cellar with tasting notes in pencil.', 'Một vườn nho, một nhà phố, và hầm rượu có ghi chú nếm bằng bút chì.', '一座葡萄园、一栋联排别墅、一个用铅笔写品鉴笔记的酒窖。'], lang) },
        { l: tr(['Sell the estate, keep the cash', 'Bán di sản, giữ tiền', '卖庄园留现金'], lang), money: 200000, out: tr(['You sign the papers and walk away. Pragmatic and restful.', 'Bạn ký giấy và bỏ đi. Thực tế và thảnh thơi.', '你签字走人。务实而轻松。'], lang) },
        { l: tr(['Donate most, keep a token', 'Quyên góp phần lớn, giữ một chút', '捐大部分，留一点'], lang), cost: 0, fame: 5, out: tr(['The town names a square after your uncle. You keep a single chair.', 'Thị xã đặt tên ông bác cho một quảng trường. Bạn giữ một chiếc ghế.', '小镇以你伯祖命名一个广场。你留下一把椅子。'], lang) }
      ]
    })
  },
  {
    kind: 'luck',
    make: ({ rich, snap }, lang) => ({
      title: tr(['A viral moment', 'Khoảnh khắc viral', '爆款时刻'], lang),
      text: snap.followers && snap.followers > 100000
        ? tr([
            `A clip of you helping someone in the rain goes viral. Even accounts that usually mock tycoons post it.`,
            `Một video bạn giúp người trong mưa viral. Cả những tài khoản hay chê bai trùm cũng đăng.`,
            `一段你在雨中帮人的视频爆了。连那些专门嘲讽富豪的账号都转了。`
          ], lang)
        : tr([
            `A clip of you helping someone in the rain goes viral. Strangers start following your story.`,
            `Một video bạn giúp người trong mưa viral. Người lạ bắt đầu theo dõi câu chuyện của bạn.`,
            `一段你在雨中帮人的视频爆了。陌生人开始关注你的故事。`
          ], lang),
      choices: [
        { l: tr(['Lean into it', 'Tận dụng', '借势发力'], lang), fame: 7, money: rich ? 30000 : 6000, out: tr(['You launch a small line of merch. It sells out by Tuesday.', 'Bạn ra mắt một dòng merch nhỏ. Cháy hàng thứ Ba.', '你推出小批周边。周二就脱销。'], lang) },
        { l: tr(['Stay quiet, let it pass', 'Im lặng, để nó qua', '低调让它过去'], lang), fame: 3, out: tr(['The clip fades. The goodwill lingers in your industry.', 'Video phai. Sự thiện cảm còn vương trong ngành.', '视频淡出。善意留在行业里。'], lang) },
        { l: tr(['Direct the attention to a cause', 'Hướng sự chú ý tới một sự nghiệp', '把流量引向公益'], lang), fame: 4, cost: 5000, out: tr(['Donations to the cause triple overnight. You become the unofficial face.', 'Quyên góp cho sự nghiệp nhân ba trong đêm. Bạn thành gương mặt đại diện không chính thức.', '该事业捐款一夜翻三倍。你成了非官方代言人。'], lang) }
      ]
    })
  },
  {
    kind: 'luck',
    make: ({ rich }, lang) => ({
      title: tr(['A forgotten stock certificate', 'Chứng khoán quên', '遗忘的股票证'], lang),
      text: tr([
        'While clearing out an old safe, you find a stock certificate your late aunt bought decades ago. The company is now a household name.',
        'Dọn két sắt cũ, bạn tìm thấy chứng khoán cô gái đã mua vài chục năm trước. Công ty giờ là thương hiệu quốc dân.',
        '清理旧保险柜时，你发现一张姑妈几十年前买的股票证。公司如今是家喻户晓的品牌。'
      ], lang),
      choices: [
        { l: tr(['Cash it in', 'Bán thu tiền', '兑现'], lang), money: rich ? 250000 : 75000, out: tr(['Your broker is speechless. The proceeds land in your account by Friday.', 'Broker bạn cạn lời. Tiền về tài khoản thứ Sáu.', '经纪人无言以对。钱周五到账。'], lang) },
        { l: tr(['Hold for the dividend', 'Giữ nhận cổ tức', '持有领股息'], lang), money: rich ? 30000 : 8000, out: tr(['A small annual cheque arrives every quarter. A nice ritual.', 'Một séc nhỏ đến mỗi quý. Một nghi lễ đẹp.', '每个季度一张小支票。一个美好的仪式。'], lang) },
        { l: tr(['Frame it in the office', 'Đóng khung ở văn phòng', '裱进办公室'], lang), fame: 1, money: 0, out: tr(['It becomes your favourite conversation piece.', 'Nó thành món trang trí khởi đầu câu chuyện yêu thích.', '它成了你最爱的谈资。'], lang) }
      ]
    })
  },
  {
    kind: 'luck',
    make: ({ rich }, lang) => ({
      title: tr(['The tax refund you forgot', 'Khoản thuế hoàn lại bạn quên', '你忘记的退税'], lang),
      text: tr([
        'Your accountant calls, sheepish. "I think we overpaid three years ago. The tax office agrees."',
        'Kế toán gọi, ngại ngùng. "Tôi nghĩ chúng ta đóng thừa ba năm trước. Cơ quan thuế đồng ý."',
        '会计打来电话，不好意思。"我猜我们三年前多交了税。税务局也同意。"'
      ], lang),
      choices: [
        { l: tr(['Take the refund', 'Nhận hoàn', '领回退款'], lang), money: rich ? 45000 : 9000, out: tr(['It lands in your account. You treat the team to dinner.', 'Tiền về tài khoản. Bạn bao đội đi ăn tối.', '钱到账。你请团队吃饭。'], lang) },
        { l: tr(['Reinvest it', 'Tái đầu tư', '再投资'], lang), cost: 0, money: rich ? 60000 : 13000, out: tr(['You buy more of your own stock. The compounding starts today.', 'Bạn mua thêm cổ phiếu mình. Lãi kép bắt đầu hôm nay.', '你加仓自家股票。复利从今天开始。'], lang) },
        { l: tr(['Donate it', 'Quyên góp', '捐掉'], lang), cost: 0, fame: 3, out: tr(['You send it to the local school. They name a scholarship.', 'Bạn gửi cho trường địa phương. Họ đặt tên một học bổng.', '你捐给本地学校。他们以你命名一项奖学金。'], lang) }
      ]
    })
  },
  // =================== badluck — loss / damage / scandal ===================
  {
    kind: 'badluck',
    make: ({ rich }, lang) => ({
      title: tr(['The warehouse fire', 'Hoả hoạn kho', '仓库起火'], lang),
      text: tr([
        'A small fire hits one of your storerooms. Nobody is hurt, but the smoke smell reaches the news.',
        'Một đám cháy nhỏ ở một kho. Không ai bị thương, nhưng mùi khói đến tai báo.',
        '一场小火烧到你的一处仓库。无人受伤，但烟味传到了新闻里。'
      ], lang),
      choices: [
        { l: tr(['Rebuild fast', 'Xây lại nhanh', '快速重建'], lang), cost: rich ? 60000 : 20000, out: tr(['Insurance plus hustle: you reopen in weeks.', 'Bảo hiểm +拼命: bạn mở lại trong vài tuần.', '保险 + 拼命：几周内重开。'], lang) },
        { l: tr(['Claim and wait', 'Khiếu nại và chờ', '理赔等待'], lang), money: 5000, out: tr(['The claim drags on, but the cheque clears. Reputation takes a nick.', 'Hồ sơ kéo dài, nhưng séc thanh toán. Danh tiếng hơi xước.', '理赔拖很久，但支票兑现。声誉小损。'], lang) },
        { l: tr(['Cut your losses', 'Cắt lỗ', '割肉止损'], lang), cost: 0, money: rich ? -30000 : -8000, decline: 4, out: tr(['You sell the lot as-is to a salvage crew. The hit stings for months.', 'Bạn bán than cho đội thanh lý. Cú sốc đau vài tháng.', '你把现场原样卖给清货队。这一击疼了好几个月。'], lang) }
      ]
    })
  },
  {
    kind: 'badluck',
    make: ({ rich }, lang) => ({
      title: tr(['A tabloid exposé', 'Báo lá cải phanh phui', '小报曝光'], lang),
      text: tr([
        'A tabloid runs a story about an old business deal. The headline is unkind and the facts are stretched.',
        'Một báo lá cải đăng tin về một thương vụ cũ. Tiêu đề ác ý và sự thật bị kéo dãn.',
        '一家小报翻炒你一笔旧交易。标题刻薄，事实被拉伸。'
      ], lang),
      choices: [
        { l: tr(['Sue them', 'Kiện họ', '起诉'], lang), cost: rich ? 80000 : 20000, fame: 2, out: tr(['After a year, they print a retraction in tiny font. You won, mostly.', 'Sau một năm, họ đăng đính chính cỡ chữ nhỏ xíu. Bạn thắng, phần lớn.', '一年后他们用极小字号刊登道歉。你大致赢了。'], lang) },
        { l: tr(['Buy the silence', 'Mua sự im lặng', '花钱消音'], lang), cost: 40000, out: tr(['The story never runs again. The cheque hurts.', 'Câu chuyện không xuất hiện nữa. Tờ séc đau.', '报道再不出现。那张支票让人心疼。'], lang) },
        { l: tr(['Tell your side on the feed', 'Kể phiên bản của bạn trên mạng', '在动态上自辩'], lang), fame: -3, money: 0, out: tr(['Your post gets more views than the tabloid. But the wound is open.', 'Bài viết của bạn có lượt xem nhiều hơn báo lá cải. Nhưng vết thương còn hở.', '你的帖子比小报更火。但伤口还在。'], lang) }
      ]
    })
  },
  {
    kind: 'badluck',
    make: ({ rich }, lang) => ({
      title: tr(['The market crash', 'Sập chứng khoán', '股市崩盘'], lang),
      text: tr([
        'The market drops 18% in a week. Your portfolio is not spared. Your broker calls with the bad news in a calm voice.',
        'Thị trường rơi 18% trong một tuần. Danh mục của bạn cũng kham. Broker gọi báo tin không hay với giọng bình tĩnh.',
        '一周内大盘跌 18%。你的持仓也未能幸免。经纪人语气平静地打来报噩耗。'
      ], lang),
      choices: [
        { l: tr(['Hold the line', 'Giữ vững', '扛住'], lang), money: rich ? -80000 : -15000, out: tr(['You hold. By the end of the quarter, half of it has come back.', 'Bạn giữ. Cuối quý, một nửa đã trở lại.', '你扛住。到季末，一半已回来。'], lang) },
        { l: tr(['Sell everything', 'Bán tất', '全抛'], lang), money: rich ? -120000 : -22000, out: tr(['You sell at the bottom. The cash sits there, mocking you.', 'Bạn bán ở đáy. Tiền mặt nằm đó, chế giễu bạn.', '你抄底抛了。现金躺在那儿嘲笑你。'], lang) },
        { l: tr(['Buy the dip', 'Đón đáy', '逢低吸纳'], lang), cost: rich ? 50000 : 10000, money: rich ? 90000 : 18000, out: tr(['You buy more. Two years later it is the best decision of the decade.', 'Bạn mua thêm. Hai năm sau, đó là quyết định xuất sắc nhất thập kỷ.', '你加仓。两年后这是十年最棒的决定。'], lang) }
      ]
    })
  },
  {
    kind: 'badluck',
    make: (_ctx, lang) => ({
      title: tr(['The thief in the night', 'Kẻ trộm đêm', '深夜窃贼'], lang),
      text: tr([
        'Someone broke into your garage. The watch you wore to your first big deal is gone. So is the cash box.',
        'Ai đó đột nhập nhà để xe. Chiếc đồng hồ bạn đeo trong thương vụ lớn đầu tiên mất. Cả hộp tiền cũng vậy.',
        '有人闯入你的车库。你第一笔大生意戴的那只表不见了。钱箱也是。'
      ], lang),
      choices: [
        { l: tr(['File a police report', 'Báo công an', '报警'], lang), cost: 0, money: -8000, out: tr(['The police are sympathetic. The watch never resurfaces.', 'Công an đồng cảm. Chiếc đồng hồ không bao giờ xuất hiện lại.', '警方同情。表再也找不回。'], lang) },
        { l: tr(['Quietly replace it', 'Yên lặng thay mới', '悄悄补一只'], lang), cost: 12000, out: tr(['You buy a similar one. Your friends do not notice. You do.', 'Bạn mua chiếc tương tự. Bạn bè không nhận ra. Bạn thì có.', '你买一只相似的。朋友没察觉。你心里清楚。'], lang) },
        { l: tr(['Post a reward', 'Đăng thưởng', '悬赏'], lang), cost: 3000, fame: 1, out: tr(['A tip comes in. You get the watch back; the cash is gone.', 'Một tin báo đến. Bạn lấy lại đồng hồ; tiền mất.', '一条线索传来。表回来了；钱没了。'], lang) }
      ]
    })
  },
  {
    kind: 'badluck',
    make: ({ rich }, lang) => ({
      title: tr(['A lawsuit lands', 'Một vụ kiện', '一桩诉讼'], lang),
      text: tr([
        "A former partner serves you papers. The claim is thin but the legal fees will not be.",
        'Một đối tác cũ gửi giấy triệu tập. Khiếu nại mỏng nhưng phí luật sư thì không.',
        '一位前合伙人送达传票。诉求站不住脚，但律师费可不便宜。'
      ], lang),
      choices: [
        { l: tr(['Settle quietly', 'Hoà giải yên lặng', '悄悄和解'], lang), cost: rich ? 70000 : 18000, out: tr(['You settle. The partner signs an NDA and disappears.', 'Bạn hoà giải. Đối tác ký NDA và biến mất.', '你和解。对方签保密协议后消失。'], lang) },
        { l: tr(['Fight it in court', 'Đấu ra toà', '打到法庭'], lang), cost: rich ? 100000 : 25000, fame: 2, out: tr(['You win. Two years of your life are gone with the legal team.', 'Bạn thắng. Hai năm cuộc đời đi cùng đội luật sư.', '你赢了。可两年的命耗在律师团队身上。'], lang) },
        { l: tr(['Mediate', 'Hòa giải', '调解'], lang), cost: 25000, fame: 1, out: tr(['A neutral third party helps. You pay a little, learn a lot.', 'Một bên thứ ba trung lập giúp. Bạn trả ít, học nhiều.', '中立第三方介入。你付一点，学一堆。'], lang) }
      ]
    })
  },
  {
    kind: 'badluck',
    make: ({ rich }, lang) => ({
      title: tr(['The bad hire', 'Lần thuê tồi', '糟糕的雇佣'], lang),
      text: tr([
        "The bright young manager you hired six months ago has been cooking the books. The auditor's call wakes you at 6am.",
        'Quản lý trẻ sáng suốt bạn thuê sáu tháng trước nay đang làm giả sổ sách. Cuộc gọi của kiểm toán viên đánh thức bạn lúc 6 giờ sáng.',
        '你半年前招的那位年轻经理做假账。审计师的电话早上 6 点把你叫醒。'
      ], lang),
      choices: [
        { l: tr(['Fire and absorb', 'Sa thải và gánh', '开除并吞下'], lang), cost: rich ? 40000 : 12000, decline: 3, out: tr(['You patch the loss. Your trust in people takes a hit.', 'Bạn lấp khoản hụt. Niềm tin vào người hơi sứt.', '你补上窟窿。对人信任受挫。'], lang) },
        { l: tr(['Press charges', 'Đệ trình', '提起控告'], lang), cost: 15000, fame: 1, out: tr(['They are charged. The story leaks. Your industry shrugs.', 'Họ bị cáo buộc. Câu chuyện rò rỉ. Ngành bạn nhún vai.', '对方被起诉。消息泄露。行业耸肩。'], lang) },
        { l: tr(['Restructure the team', 'Tái cấu trúc đội', '重组团队'], lang), cost: 22000, decline: 2, out: tr(['You hire an outside CFO. The bill is steep; the lesson is steeper.', 'Bạn thuê CFO ngoài. Hoá đơn cao; bài học đắt hơn.', '你外聘 CFO。账单陡峭；教训更陡。'], lang) }
      ]
    })
  },
  // =================== lifestage — close shop / dropout / wrong turn ===================
  {
    kind: 'lifestage',
    make: ({ snap, biz }, lang) => ({
      title: tr(['Close shop early?', 'Đóng cửa sớm?', '提早关店？'], lang),
      text: biz
        ? tr([
            `Your ${biz} line is bleeding cash and the trend is not reversing. Your CFO suggests shutting branches now, taking the loss, and redeploying the capital. The decision sits on your desk.`,
            `Mảng ${biz} đang mất máu và xu hướng không đảo chiều. CFO đề nghị đóng chi nhánh ngay, nhận lỗ, và tái triển khai vốn. Quyết định nằm trên bàn bạn.`,
            `你的 ${biz} 业务在失血且趋势不反转。CFO 建议立刻关店止损，重新部署资本。决定摆在你桌上。`
          ], lang)
        : tr([
            'One of your lines is bleeding cash. Your CFO suggests shutting branches now, taking the loss, and redeploying the capital. The decision sits on your desk.',
            'Một mảng đang mất máu. CFO đề nghị đóng chi nhánh ngay, nhận lỗ, và tái triển khai vốn. Quyết định nằm trên bàn bạn.',
            '你的一条业务线在失血。CFO 建议立刻关店止损，重新部署资本。决定摆在你桌上。'
          ], lang),
      choices: [
        { l: tr(['Liquidate two branches', 'Thanh lý hai chi nhánh', '清算两家分店'], lang), cost: 0, money: snap.netWorth && snap.netWorth > 1e6 ? 14000 : 6000, liquidate: { biz: 'cafe', n: 2 }, out: tr(['You close two branches. The salvage cheque stings less than expected.', 'Bạn đóng hai chi nhánh. Séc thanh lý đau ít hơn dự kiến.', '你关了两家分店。清盘支票比预想中没那么疼。'], lang) },
        { l: tr(['Liquidate hard — five branches', 'Thanh lý mạnh — năm chi nhánh', '狠心清算五家'], lang), cost: 0, money: snap.netWorth && snap.netWorth > 1e6 ? 36000 : 14000, liquidate: { biz: 'cafe', n: 5 }, out: tr(['You cut deep. The team is in shock. The runway just doubled.', 'Bạn cắt sâu. Đội sốc. Quỹ runway vừa nhân đôi.', '你下狠手。团队震惊。跑道翻倍。'], lang) },
        { l: tr(['Refuse. Ride it out.', 'Từ chối. Trụ tiếp.', '拒绝。硬扛。'], lang), money: -8000, decline: 6, out: tr(['You stay the course. Three months later, you wish you had not.', 'Bạn giữ hướng. Ba tháng sau, bạn ước gì đã không.', '你坚持原路。三个月后，你后悔没早动。'], lang) }
      ]
    })
  },
  {
    kind: 'lifestage',
    make: ({ y, era }, lang) => ({
      title: tr(['Drop out to chase the era?', 'Bỏ học đuổi theo thời đại?', '退学追时代？'], lang),
      text: tr([
        `${era} is reshaping every industry. A friend who dropped out last year just raised a round at a valuation you can't stop thinking about. Your current course feels like it was designed for a decade that no longer exists.`,
        `${era} đang định hình lại mọi ngành. Một người bạn bỏ học năm ngoái vừa gọi được vốn ở định mức bạn không ngừng nghĩ tới. Khoá hiện tại có cảm giác thiết kế cho thập kỷ không còn tồn tại.`,
        `${era} 正在重塑每个行业。一位去年退学的朋友刚以一个让你念念不忘的估值融到资。你当前的课程像是为已经不存在的十年设计的。`
      ], lang),
      choices: [
        { l: tr(['Drop your main study, pivot', 'Bỏ học chính, đổi hướng', '退主修，转向'], lang), cost: 0, money: 0, dropout: { slot: 'study' }, out: tr(['You leave the program. Six months of chaos, then it clicks.', 'Bạn rời chương trình. Sáu tháng hỗn loạn, rồi mọi thứ khớp.', '你离开课程。六个月混乱，然后豁然开朗。'], lang) },
        { l: tr(['Drop your side study', 'Bỏ học phụ', '退辅修'], lang), cost: 0, money: 0, dropout: { slot: 'sideStudy' }, out: tr(['You let the parallel course go. The freed bandwidth pays off within weeks.', 'Bạn bỏ khoá song song. Băng thông tự do sinh lời trong vài tuần.', '你放下并行课程。腾出的精力几周内见效。'], lang) },
        { l: tr(['Stay the course', 'Giữ đà', '坚持原路'], lang), money: 0, decline: 4, out: tr(['You finish what you started. The era waits for nobody, but you have a credential.', 'Bạn hoàn thành điều đã bắt đầu. Thời đại không chờ ai, nhưng bạn có bằng.', '你把开始的做完。时代不等人，但你拿到了证书。'], lang) }
      ]
    })
  },
  {
    kind: 'lifestage',
    make: ({ y, snap }, lang) => ({
      title: tr(['The era no longer needs you', 'Thời đại không còn cần bạn', '时代不再需要你'], lang),
      text: snap.job
        ? tr([
            `In ${y}, your line of work is being automated faster than anyone predicted. Your role as ${snap.job} is half as valuable as it was two years ago. The writing is on the wall; the question is whether you read it in time.`,
            `Năm ${y}, ngành của bạn đang bị tự động hoá nhanh hơn ai đoán. Vai trò ${snap.job} chỉ còn giá trị một nửa hai năm trước. Dấu hiệu rõ; câu hỏi là bạn đọc kịp không.`,
            `${y} 年，你的行当被自动化的速度超乎所有人预料。你作为 ${snap.job} 的价值只剩两年前的一半。征兆已明；问题是你是否来得及读懂。`
          ], lang)
        : tr([
            `In ${y}, your line of work is being automated faster than anyone predicted. Your industry is half as valuable as it was two years ago. The writing is on the wall; the question is whether you read it in time.`,
            `Năm ${y}, ngành của bạn đang bị tự động hoá nhanh hơn ai đoán. Ngành của bạn chỉ còn giá trị một nửa hai năm trước. Dấu hiệu rõ; câu hỏi là bạn đọc kịp không.`,
            `${y} 年，你的行当被自动化的速度超乎所有人预料。你的行业只剩两年前的一半价值。征兆已明；问题是你是否来得及读懂。`
          ], lang),
      choices: [
        { l: tr(['Re-skill hard', 'Học lại gắt', '硬核再学习'], lang), cost: 30000, money: 0, decline: 3, out: tr(['You enrol in an intensive re-skilling program. The future costs; it also pays.', 'Bạn ghi danh khoá tái đào tạo cường độ cao. Tương lai tốn; nhưng cũng trả.', '你报名高强度再培训。未来有代价；也会回报。'], lang) },
        { l: tr(['Sell the line, retire early', 'Bán mảng, nghỉ sớm', '卖掉业务，提早退休'], lang), cost: 0, money: 50000, decline: 5, out: tr(['You sell before the floor drops. The cash is comfort. The pride is gone.', 'Bạn bán trước khi sàn sập. Tiền là an ủi. Niềm tự hào mất rồi.', '你在底掉之前卖出。现金是慰藉。骄傲没了。'], lang) },
        { l: tr(['Pivot the business to the new era', 'Chuyển doanh nghiệp sang thời mới', '把业务转向新时代'], lang), cost: 60000, money: 0, out: tr(['You retool. The first quarter is brutal. The third quarter is the best you have ever had.', 'Bạn tái trang bị. Quý đầu tàn khốc. Quý ba là quý xuất sắc nhất từ trước tới nay.', '你重整。第一季度残酷。第三季度是你经历过最好的。'], lang) }
      ]
    })
  },
  {
    kind: 'lifestage',
    make: ({ snap }, lang) => ({
      title: tr(['A wrong turn', 'Một ngã rẽ sai', '一个错误转弯'], lang),
      text: snap.businesses?.length
        ? tr([
            'You realise, late one night, that the last big decision was wrong. The expansion should have been a stall. The numbers do not lie; only your pride does.',
            'Bạn nhận ra, khuya một đêm, quyết định lớn gần nhất đã sai. Mở rộng lẽ ra phải dừng lại. Con số không nói dối; chỉ lòng tự hức của bạn nói dối.',
            '深夜你意识到：上一个重大决定错了。该扩张的其实该暂停。数字不会撒谎；只有你的骄傲在撒谎。'
          ], lang)
        : tr([
            'You realise, late one night, that the last big decision was wrong. The hire should have been a no. The numbers do not lie; only your pride does.',
            'Bạn nhận ra, khuya một đêm, quyết định lớn gần nhất đã sai. Lần thuê lẽ ra phải là không. Con số không nói dối; chỉ lòng tự hức của bạn nói dối.',
            '深夜你意识到：上一个重大决定错了。该雇的其实该拒绝。数字不会撒谎；只有你的骄傲在撒谎。'
          ], lang),
      choices: [
        { l: tr(['Reverse course publicly', 'Đảo chiều công khai', '公开掉头'], lang), cost: 15000, fame: 3, out: tr(['You announce the reversal. The press calls it courage. Your team calls it a leader.', 'Bạn công bố đảo chiều. Báo chí gọi là dũng khí. Đội gọi là lãnh đạo.', '你宣布掉头。媒体称之为勇气。团队称之为领袖。'], lang) },
        { l: tr(['Quietly undo it', 'Yên lặng đảo ngược', '悄悄撤销'], lang), cost: 8000, decline: 3, out: tr(['You undo the move. Nobody notices except your accountant, and you.', 'Bạn xoá bước đi. Không ai nhận ra trừ kế toán và bạn.', '你撤销动作。除了会计和你没人察觉。'], lang) },
        { l: tr(['Push through, deny it', 'Cứng đầu, phủ nhận', '硬撑，否认'], lang), money: -12000, decline: 9, out: tr(['You push through. The damage compounds for a year before you admit it.', 'Bạn cứng đầu. Thiệt hại cộng dồn một năm trước khi bạn thừa nhận.', '你硬撑。损害复利一年你才承认。'], lang) }
      ]
    })
  },
  {
    kind: 'lifestage',
    make: ({ snap, biz }, lang) => ({
      // v11.8 — fixed legacy bug: "签字笔" (Chinese for "signing pen") was
      // accidentally pasted into the English template; now consistent EN.
      title: tr(['Sell the company?', 'Bán công ty?', '卖掉公司？'], lang),
      text: snap.age && snap.age > 55
        ? tr([
            `A buyer has offered to acquire your ${biz || 'main business'} line. The number is real. The signing pen is on the table. You are not getting younger.`,
            `Một người mua đề nghị thâu tóm mảng ${biz || 'kinh doanh chính'}. Con số thật. Bút ký trên bàn. Bạn không trẻ lại.`,
            `有人要收购你的${biz || '主营'}业务。报价真实。签字笔摆在桌上。你也不再年轻。`
          ], lang)
        : tr([
            `A buyer has offered to acquire your ${biz || 'main business'} line. The number is real. The signing pen is on the table. Your team is watching your face for an answer.`,
            `Một người mua đề nghị thâu tóm mảng ${biz || 'kinh doanh chính'}. Con số thật. Bút ký trên bàn. Đội đang nhìn mặt bạn chờ câu trả lời.`,
            `有人要收购你的${biz || '主营'}业务。报价真实。签字笔摆在桌上。团队正盯着你的脸等答案。`
          ], lang),
      choices: [
        { l: tr(['Sell — take the deal', 'Bán — nhận deal', '卖 — 接交易'], lang), cost: 0, money: 250000, fame: 4, out: tr(['You sell. The proceeds are life-changing. The company survives under new owners.', 'Bạn bán. Tiền đổi đời. Công ty sống dưới chủ mới.', '你卖了。钱改变人生。公司在新的所有者下延续。'], lang) },
        { l: tr(['Sell a majority stake, stay on', 'Bán phần lớn, ở lại', '卖多数股权，留下'], lang), cost: 0, money: 150000, fame: 2, out: tr(['You sell 60%. You keep the corner office and lose the final word.', 'Bạn bán 60%. Bạn giữ văn phòng góc và mất tiếng nói cuối cùng.', '你卖 60%。你保住角落办公室，但失去最终决定权。'], lang) },
        { l: tr(['Refuse. Build the empire.', 'Từ chối. Xây đế chế.', '拒绝。建帝国。'], lang), money: 0, decline: 2, out: tr(['You refuse. The buyer walks. You either prove them wrong or yourself wrong.', 'Bạn từ chối. Người mua rời. Bạn hoặc chứng minh họ sai, hoặc mình sai.', '你拒绝。买家离开。你要么证明他们错，要么证明自己错。'], lang) }
      ]
    })
  },
  {
    kind: 'lifestage',
    make: ({ snap }, lang) => ({
      title: tr(['Burnout at the door', 'Kiệt sức trước cửa', '倦怠临门'], lang),
      text: snap.health && snap.health < 60
        ? tr([
            `Your doctor is worried. Your partner is worried. Your last blood panel was not great. The question is whether you slow down now or pay for it later.`,
            `Bác sĩ lo. Bạn đời lo. Xét nghiệm máu gần nhất không tốt. Câu hỏi là bạn có chậm lại ngay hay trả giá sau.`,
            `医生担心。伴侣担心。你最近血检不太好。问题是现在慢下来还是以后付代价。`
          ], lang)
        : tr([
            `Your doctor is worried. Your partner is worried. You haven't slept a full eight hours in months. The question is whether you slow down now or pay for it later.`,
            `Bác sĩ lo. Bạn đời lo. Bạn chưa ngủ đủ tám tiếng cả tháng. Câu hỏi là bạn chậm lại ngay hay trả giá sau.`,
            `医生担心。伴侣担心。你好几个月没睡足八小时。问题是现在慢下来还是以后付代价。`
          ], lang),
      choices: [
        { l: tr(['Take a sabbatical', 'Nghỉ phép dài', '休长假'], lang), cost: 20000, money: 0, out: tr(['You take three months off. You come back a different person.', 'Bạn nghỉ ba tháng. Bạn trở lại là người khác.', '你休三个月。回来后判若两人。'], lang) },
        { l: tr(['Promote a deputy, step back to chair', 'Thăng phó, lùi về chủ tịch', '提拔副手，退主席'], lang), cost: 10000, decline: 0, out: tr(['You promote someone hungry and capable. You move to the chair role.', 'Bạn thăng người có chí có năng. Bạn sang vai chủ tịch.', '你提拔一个有干劲有能力的。你转到主席位。'], lang) },
        { l: tr(['Power through', 'Cố gắng qua', '硬扛过去'], lang), cost: 0, decline: 10, out: tr(['You power through. The work is done. Your body keeps a ledger.', 'Bạn cứng đầu qua. Việc xong. Cơ thể giữ sổ sách riêng.', '你硬扛过去。活干完了。身体在记账。'], lang) }
      ]
    })
  }
];

export function localTwist(snap: Snap, used: string[], kind?: AIEventKind, lang: Lang = 'en'): AIEvent {
  const ctx: Ctx = {
    y: snap.year || 2020,
    era: snap.era || 'modern times',
    rich: (snap.netWorth || 0) > 1e6,
    biz: snap.businesses && snap.businesses.length ? snap.businesses[0] : '',
    snap
  };
  const chosenKind = kind || pickKind(snap);
  const pool = TEMPLATES.filter(t => t.kind === chosenKind);
  const usable = pool.length ? pool : TEMPLATES;
  // v11.8 — dedup by canonical English title so existing saves (which stored
  // English titles throughout v10–v11.7) remain compatible.
  const freshPool = usable.filter(t => !used.includes(t.make(ctx, 'en').title));
  const finalPool = freshPool.length ? freshPool : usable;
  const pick = finalPool[Math.floor(Math.random() * finalPool.length)];
  const ev = pick.make(ctx, lang);
  // v12.3 — filter out choices that can't apply to the player's current state.
  // liquidate: only if they have branches. dropout: only if they're studying.
  ev.choices = ev.choices.filter(c => {
    if (c.liquidate) {
      // Check if player has branches of the specified biz type.
      // snap.businesses is a list of biz names, not ids — but the liquidate
      // target is a biz id like 'cafe'. We check if ANY business exists.
      const hasBranches = (snap.businesses?.length || 0) > 0;
      if (!hasBranches) return false;
    }
    if (c.dropout) {
      // Only show dropout if the player is actually studying.
      const isStudying = (snap.studying?.length || 0) > 0;
      if (!isStudying) return false;
    }
    return true;
  });
  // If filtering removed ALL choices, add a safe fallback.
  if (ev.choices.length === 0) {
    ev.choices = [{ l: 'Move on', cost: 0, money: 0, out: 'Nothing happens. The moment passes.' }];
  }
  // keep numbers sane relative to wealth — v12.3: reduced cap from 40% to 25%
  const cap = Math.max(3000, Math.round(Math.max(0, snap.netWorth || 0) * 0.25));
  ev.choices = ev.choices.map(c => ({
    ...c,
    cost: c.cost ? Math.min(c.cost, cap) : undefined,
    money: c.money ? Math.max(-cap * 2, Math.min(c.money, cap * 2)) : undefined
  }));
  return { ...ev, source: 'local', kind: chosenKind };
}
