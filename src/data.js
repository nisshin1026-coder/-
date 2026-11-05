/** Original bestiary and combat vocabulary for 星織りの庭. */
export const ELEMENTS = {
  neutral: { label: '無', color: '#c4b8a5' },
  fire: { label: '火', color: '#ef936d' },
  water: { label: '水', color: '#72bcda' },
  wind: { label: '風', color: '#9ccda1' },
  earth: { label: '地', color: '#c9ac78' },
  ice: { label: '氷', color: '#b0e1e9' },
  thunder: { label: '雷', color: '#e8cf79' },
  light: { label: '光', color: '#f3dda2' },
  dark: { label: '闇', color: '#ad9acb' },
  poison: { label: '毒', color: '#c397c2' },
};

export const STATUS_LABELS = {
  burn: 'やけど', petrify: '石化', freeze: '凍結', paralysis: '麻痺',
  sleep: '睡眠', poison: '毒', weaken: '弱化', confusion: '混乱',
  stun: '気絶', seal: '封印',
};

const skillRows = [
  ['tackle', '星くずタックル', 'neutral', 38, 0, 'physical', 97, null, '魔力を使わない、確実な基本技。'],
  ['neutral_magic', '夢のかけら', 'neutral', 46, 7, 'magic', 95, null, '淡い夢の粒をまとわせて放つ。'],
  ['neutral_status', 'まどろみの歌', 'neutral', 18, 10, 'magic', 86, 'sleep', '眠りを誘う子守歌。睡眠で相手の行動を妨げる。'],
  ['fire_strike', '朱尾の一撃', 'fire', 51, 8, 'physical', 95, null, '尾に小さな炎を灯して薙ぎ払う。'],
  ['fire_magic', '灯火の流星', 'fire', 62, 13, 'magic', 92, null, '小さな流星を束ねて撃ち出す。'],
  ['fire_status', '残り火のキス', 'fire', 32, 10, 'magic', 92, 'burn', '残り火がやけどを与え、継続して体力を奪う。'],
  ['water_strike', '水鏡の刃', 'water', 49, 8, 'physical', 97, null, '鏡のように澄んだ水で鋭く斬る。'],
  ['water_magic', '深海のワルツ', 'water', 60, 13, 'magic', 94, null, '幾重もの水輪が相手を包み込む。'],
  ['water_status', '潮騒の迷宮', 'water', 28, 11, 'magic', 88, 'confusion', '幾重にも反響する潮騒で混乱を誘う。'],
  ['wind_strike', '青嵐ステップ', 'wind', 46, 7, 'physical', 99, null, '風に足音を隠した素早い一撃。'],
  ['wind_magic', '翠の螺旋', 'wind', 57, 12, 'magic', 96, null, '花びらを乗せた上昇気流を巻き起こす。'],
  ['wind_status', 'うつろいの風', 'wind', 25, 10, 'magic', 92, 'weaken', '力をさらう風で相手を弱化させる。'],
  ['earth_strike', '琥珀の槌', 'earth', 60, 10, 'physical', 90, null, '琥珀色の大地の力で重い一撃を放つ。'],
  ['earth_magic', '地脈のこだま', 'earth', 60, 13, 'magic', 93, null, '足元から広がる振動が相手を捉える。'],
  ['earth_status', '石庭のゆりかご', 'earth', 26, 13, 'magic', 82, 'petrify', '古い石の記憶を呼び覚まし、相手を石化させる。'],
  ['ice_strike', '氷花の爪', 'ice', 51, 8, 'physical', 95, null, '指先に咲いた氷の花で引っかく。'],
  ['ice_magic', '白夜のプリズム', 'ice', 64, 14, 'magic', 91, null, '六角形の結晶が光を反射して襲いかかる。'],
  ['ice_status', '冬眠の結晶', 'ice', 27, 13, 'magic', 84, 'freeze', '静かな冬を閉じ込めた結晶で凍結させる。'],
  ['thunder_strike', '雷光ダッシュ', 'thunder', 55, 9, 'physical', 94, null, '一瞬の閃光になって駆け抜ける。'],
  ['thunder_magic', '天球スパーク', 'thunder', 65, 14, 'magic', 90, null, '星座の線をなぞるように雷が走る。'],
  ['thunder_status', 'しびれる星雨', 'thunder', 30, 11, 'magic', 90, 'paralysis', '小さな電気の雨が相手を麻痺させる。'],
  ['light_strike', '暁の一閃', 'light', 52, 9, 'physical', 97, null, '夜明けの光をまとって踏み込む。'],
  ['light_magic', '天窓の祝福', 'light', 61, 13, 'magic', 95, null, '雲間からまっすぐ降り注ぐ光の柱。'],
  ['light_status', '星暦の封印', 'light', 24, 12, 'magic', 90, 'seal', '星の文字で魔力を封印し、魔法の使用を妨げる。'],
  ['dark_strike', '月影の爪', 'dark', 57, 9, 'physical', 93, null, '影を渡って相手の懐に飛び込む。'],
  ['dark_magic', '夜のオルゴール', 'dark', 65, 14, 'magic', 92, null, '深い夜の旋律が心を揺さぶる。'],
  ['dark_status', '真夜中の幕', 'dark', 25, 12, 'magic', 85, 'stun', '星の消えた夜の幕で一時的に気絶させる。'],
  ['poison_strike', '紫苑の棘', 'poison', 48, 8, 'physical', 96, null, '紫苑色の棘で狙いを定めた一撃。'],
  ['poison_magic', '薄暮の香り', 'poison', 58, 12, 'magic', 95, null, '甘く不思議な香りの霧を吹き出す。'],
  ['poison_status', '月露のしずく', 'poison', 30, 10, 'magic', 95, 'poison', '毒を帯びた露で、毎ターン体力を削る。'],
  ['heal', 'やすらぎの芽', 'light', 42, 12, 'heal', 100, null, '小さな芽の生命力で自分の体力を回復する。'],
  ['ward', '星殻のまもり', 'neutral', 0, 5, 'buff', 100, null, '光の殻をまとい、防御力と魔防を高める。'],
  ['focus', '心を澄ませる', 'neutral', 0, 6, 'buff', 100, null, '呼吸を整え、防御力と魔防を高める。'],
];

export const SKILLS = Object.fromEntries(skillRows.map(([id, name, element, power, cost, category, accuracy, status, description]) => [id, {
  id, name, element, power, cost, category, accuracy, ...(status ? { status } : {}), description,
}]));

// Name, shape, body, accent, rarity, personality, individual lore.
const families = {
  neutral: [
    ['モチル', 'rabbit', '#e6d6ba', '#b6a6cd', 1, '甘えんぼ', '月の粉をこねたような耳を持つ。名前を呼ぶと、ぽふんと跳ねて返事をする。'],
    ['ネムリネ', 'cat', '#bfc1d2', '#edc4b8', 2, 'のんびり', '夢を糸にして編む子猫。眠る場所にはふわふわの雲が残る。'],
    ['ポロン', 'slime', '#e8c6a3', '#fff1cf', 1, '食いしんぼ', '焼き菓子に似た甘い香りのしずく。おいしい記憶を丸い体にしまっている。'],
    ['シロガネ', 'fox', '#d8d5ce', '#8795aa', 4, '誇り高い', '銀の尾に旅人の願いを結ぶ。約束した道は、どんな夜でも見失わない。'],
    ['ユメノハ', 'deer', '#d6c6ab', '#c5b6e3', 5, 'おだやか', '枝角に眠る夢の種を育てる。夜明け前だけ、角に透明な花が咲く。'],
  ],
  fire: [
    ['コハルビ', 'fox', '#edab74', '#fff0cf', 2, '好奇心旺盛', 'しっぽの灯火は喜ぶほど大きくなる。冷えた星の欠片を温めるのが得意。'],
    ['アカネリュウ', 'dragon', '#d67a64', '#ecc594', 4, '勇敢', '夕焼けを翼に織り込んだ竜。大切な相手には熱くない炎を分け与える。'],
    ['ヒノマリ', 'slime', '#f2b65b', '#ec7759', 1, 'やんちゃ', 'たき火から転がり出た小さな火種。踊るように跳ねると火花の花が咲く。'],
    ['トウカ', 'bird', '#c87158', '#f6d397', 3, '世話好き', '翼の先に灯籠のような光をともす。迷子の星獣を巣まで案内する。'],
    ['エンジュ', 'deer', '#a96b58', '#ffcf7a', 5, '凛々しい', '角に消えない夕日を宿す森の守り手。足跡には赤い小花が芽吹く。'],
  ],
  water: [
    ['ミナモル', 'slime', '#8acbd2', '#deeff0', 1, '人なつこい', '波紋の形を覚える小さなしずく。撫でると澄んだ水琴の音がする。'],
    ['シオネ', 'fox', '#7aabc7', '#d3e8e3', 2, '照れ屋', '耳に小さな潮だまりを隠す。嬉しいと頬のひれが透き通る。'],
    ['ラグナス', 'dragon', '#548ca7', '#a0dfd1', 4, '冷静', '湖底の古い鐘を守る水竜。尾を振るたび、空中に水の輪が浮かぶ。'],
    ['アワコロ', 'turtle', '#6eb5a9', '#cae5c1', 2, 'マイペース', '泡でできた甲羅を背負う。背中で眠ると海の向こうの夢を見られる。'],
    ['ウミツムギ', 'serpent', '#526e9d', '#b5e3e3', 5, '思慮深い', '夜の海流を一本の糸に紡ぐ。からだの星模様は潮の満ち引きで変わる。'],
  ],
  wind: [
    ['ハネコ', 'cat', '#b7cfaf', '#f3e6ba', 1, '自由奔放', '葉っぱの耳で風の便りを聞く。くしゃみをすると小さな旋風が生まれる。'],
    ['ソヨリ', 'rabbit', '#b8d9c5', '#e9e9cb', 2, '臆病', '長い耳が風見の羽になる。信頼する相手のそばでは耳をゆっくり畳む。'],
    ['カザハヤ', 'bird', '#7aaf9c', '#e7d5a0', 3, '負けず嫌い', '高原の風を追い越す翼を持つ。雲に自分だけの航路を描いている。'],
    ['フウリ', 'fox', '#9bb8a1', '#e5efd3', 4, 'いたずら好き', '三つ編みのような尾で気流を結ぶ。風に乗せて秘密の歌を届ける。'],
    ['テンロク', 'deer', '#639481', '#c8e9c9', 5, '気高い', '空を歩く枝角の獣。足元から生まれる風が、遠い島の花粉を運ぶ。'],
  ],
  earth: [
    ['コケマル', 'golem', '#aaa17b', '#bad099', 1, 'おっとり', '苔の帽子を大事にする小さな石の子。雨の日は一日中ごきげん。'],
    ['クルミト', 'turtle', '#a28c6f', '#e2c995', 2, 'がんばり屋', '木の実のような甲羅に畑の種を運ぶ。歩いた場所は土がふかふかになる。'],
    ['ドロッタ', 'slime', '#bb936f', '#e6c997', 1, '無邪気', 'やわらかな陶土から生まれた星獣。眠ると小さな植木鉢の形になる。'],
    ['ガンリュウ', 'dragon', '#887d68', '#cfaa74', 4, '頑固', '背中に鉱脈を持つ岩の竜。信頼を得ると、とっておきの晶石をくれる。'],
    ['トワイシ', 'golem', '#8e9380', '#e3c68a', 5, '寡黙', '忘れられた庭の門を守り続けた石像。胸の隙間に一輪の花が咲く。'],
  ],
  ice: [
    ['ユキミミ', 'rabbit', '#d6e7e5', '#a5bddc', 1, '甘えんぼ', '新雪のように柔らかい耳の持ち主。抱きしめても不思議と冷たくない。'],
    ['シモネコ', 'cat', '#c0d1e0', '#eee3ed', 2, '気まぐれ', '窓に霜の絵を描く小猫。お気に入りの人には雪の結晶を贈る。'],
    ['ツララネ', 'serpent', '#90b8ce', '#e1f3ee', 3, '繊細', '透き通った氷の鈴を尾に下げる。泳ぐように滑る姿は冬の流れ星。'],
    ['ヒョウカ', 'bird', '#a4c7d9', '#e5ecf8', 4, '几帳面', '六角形の羽を持つ雪原の鳥。巣を作る結晶は一つとして同じ形がない。'],
    ['グラシエル', 'dragon', '#7f9dbd', '#cbefef', 5, '誇り高い', '翼の氷に千年前の星空を残す。春を待つ種たちを眠りの中で守る。'],
  ],
  thunder: [
    ['ピカリム', 'rabbit', '#e9d089', '#bda779', 1, 'せっかち', '耳の先がぱちぱち光る跳ね兎。嬉しすぎると足が地面から浮いてしまう。'],
    ['ライコロ', 'slime', '#edda8d', '#e8a767', 2, '陽気', '雷雲から落ちた丸い火花。体の中に小さな稲妻がくるくる回っている。'],
    ['ナルカミ', 'fox', '#d5b371', '#f3e8b1', 3, '強気', '雷の音を尾に溜める金の狐。怖がる子の前では、雷を子守歌に変える。'],
    ['センコウ', 'bird', '#b7a075', '#ffe5a1', 4, '情熱的', '雲から雲へ電光の橋を架ける鳥。羽ばたいたあとに金の軌跡が残る。'],
    ['ライガルド', 'dragon', '#a99476', '#f9d46e', 5, '勇猛', '星の嵐から庭を守る雷竜。胸の結晶には最初の雷鳴が眠っている。'],
  ],
  light: [
    ['ルミル', 'rabbit', '#f4e5bf', '#dec5a3', 1, '素直', '朝露を集める光の子。瞳に映った星は、昼間でも消えることがない。'],
    ['ホシプル', 'slime', '#eddda3', '#fff5db', 2, '夢見がち', '星砂の瓶からこぼれたしずく。満腹になると中に小さな星座が浮かぶ。'],
    ['アウリネ', 'cat', '#e4cc9a', '#f6eee0', 3, '優しい', '陽だまりをしっぽに巻く子猫。悲しいときは黙って隣に座ってくれる。'],
    ['セラフィン', 'bird', '#e9ddc5', '#d7ba7b', 4, '献身的', '羽の一枚ずつが小さな祈り。傷ついた星獣に黄金の羽根を落としていく。'],
    ['アストリア', 'deer', '#e0d3b5', '#f7e7b1', 5, '慈愛深い', '最初の庭に生まれた星角の獣。百年に一度、角から新しい星が旅立つ。'],
  ],
  dark: [
    ['ヨルネ', 'cat', '#79748d', '#c6b5da', 1, '寂しがり', '夜色の毛並みに小さな星が隠れる。暗闇が苦手な仲間の手をそっと引く。'],
    ['クロモチ', 'slime', '#91859f', '#d4b9dc', 2, '甘えんぼ', '影のすみから生まれた柔らかい子。手をつなぐと影まで丸くなる。'],
    ['ツキカゲ', 'fox', '#72768e', '#d9c6e8', 3, '秘密主義', '三日月を隠した尾を持つ。月のない夜には尾を掲げ、道しるべになる。'],
    ['ノクティア', 'serpent', '#64677f', '#acabd7', 4, '物静か', '夜空の縫い目を泳ぐ長い影。星がこぼれないよう空の裂け目を繕う。'],
    ['エクリプス', 'dragon', '#5f6177', '#b2a5d5', 5, '孤高', '日食の輪を角に宿す竜。闇を恐れず進む心にだけ、その名を明かす。'],
  ],
  poison: [
    ['キノピィ', 'rabbit', '#c6a3bc', '#eed1c8', 1, 'おちゃめ', '茸のような耳から甘い胞子を振るう。毒の強さを一生懸命練習中。'],
    ['シズクモ', 'slime', '#b7a1c9', '#d8c3e8', 2, 'のんびり', 'すみれの露から生まれたしずく。薄めた毒は庭の花を元気にする。'],
    ['スミレイ', 'serpent', '#a387b5', '#dcbbd5', 3, '慎重', 'すみれ色の鱗に薬草の香りを宿す。森の病を探して静かに巡回する。'],
    ['ドクラン', 'bird', '#9c83a7', '#d8a8c2', 4, '気品がある', '蘭の花に似た翼を広げる。羽の毒は、敵には眠りを、花には恵みを与える。'],
    ['ヴェノリア', 'dragon', '#87768e', '#d1b0cc', 5, '知的', 'あらゆる毒を薬に変える古い竜。胸には枯れない夜の花を咲かせている。'],
  ],
};

const speciesLabels = { fox: '星狐', dragon: '星竜', slime: '星しずく', bird: '星鳥', golem: '石の星獣', cat: '星猫', rabbit: '星兎', deer: '星鹿', turtle: '星亀', serpent: '星蛇' };
const bodyModifiers = {
  fox: [0, 2, 3, -2, 8, 0, 4, 2, 0],
  dragon: [23, 5, 8, 5, -3, -2, -2, 6, 4],
  slime: [8, 8, -5, -2, -4, 2, 0, 7, 5],
  bird: [-9, 3, 2, -4, 12, 3, 7, 3, -1],
  golem: [32, -8, 8, 14, -10, -3, -4, -4, 3],
  cat: [-2, 3, 3, -3, 9, 4, 6, 4, 1],
  rabbit: [-4, 5, -1, -2, 10, 3, 5, 3, 2],
  deer: [10, 7, 0, 2, 4, 2, 2, 8, 7],
  turtle: [26, 0, 0, 16, -9, 0, -4, 0, 8],
  serpent: [2, 7, 2, 0, 5, 4, 3, 6, 4],
};

export const MONSTERS = Object.entries(families).flatMap(([element, rows], elementIndex) => rows.map((row, index) => {
  const [name, shape, color, accent, rarity, personality, description] = row;
  const keys = ['hp', 'mp', 'attack', 'defense', 'agility', 'accuracy', 'evasion', 'magicAttack', 'magicDefense'];
  const base = [105 + rarity * 8, 36 + rarity * 4, 22 + rarity * 3, 20 + rarity * 3, 24 + rarity * 2, 92, 5, 23 + rarity * 3, 21 + rarity * 3];
  const stats = Object.fromEntries(keys.map((key, i) => [key, base[i] + bodyModifiers[shape][i]]));
  const skills = element === 'neutral'
    ? ['tackle', 'neutral_magic', 'neutral_status', index % 2 === 0 ? 'heal' : 'ward']
    : ['tackle', `${element}_magic`, `${element}_status`, index % 2 === 0 ? 'heal' : `${element}_strike`];
  return {
    id: `m${String(elementIndex * 5 + index + 1).padStart(2, '0')}`,
    name, element, rarity, species: speciesLabels[shape], description, personality,
    shape, color, accent, seed: 137 + elementIndex * 79 + index * 31, stats, skills,
  };
}));
