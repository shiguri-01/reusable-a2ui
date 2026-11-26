import { defineSeed } from "void/seed";
import { PRESET_UI_VERSIONS } from "../src/features/a2ui/presets";

const SAMPLE_EXPENSES = [
  {
    title: "スーパーで週の食材まとめ買い",
    amount: 4680,
    category: "食費",
    spentAt: "2026-11-25",
    note: "野菜・肉・牛乳",
  },
  {
    title: "作業用カフェラテ",
    amount: 580,
    category: "カフェ",
    spentAt: "2026-11-25",
    note: "駅前ロースタリー",
  },
  {
    title: "電車・バス ICチャージ",
    amount: 3000,
    category: "交通",
    spentAt: "2026-11-24",
    note: "Suica",
  },
  {
    title: "ランチ定食",
    amount: 1150,
    category: "食費",
    spentAt: "2026-11-24",
    note: "焼き魚定食",
  },
  {
    title: "ドラッグストアで日用品",
    amount: 1940,
    category: "日用品",
    spentAt: "2026-11-23",
    note: "洗剤・ティッシュ",
  },
  {
    title: "技術書を購入",
    amount: 3520,
    category: "娯楽",
    spentAt: "2026-11-22",
    note: "UI設計の本",
  },
  {
    title: "ドリップコーヒー豆 200g",
    amount: 1650,
    category: "カフェ",
    spentAt: "2026-11-21",
    note: "エチオピア浅煎り",
  },
  {
    title: "友人と夕食",
    amount: 5400,
    category: "食費",
    spentAt: "2026-11-20",
    note: "イタリアン",
  },
];

export default defineSeed<typeof import("./schema")>(async ({ db, schema }) => {
  await db.insert(schema.expenses).values(SAMPLE_EXPENSES);

  await db.insert(schema.uiVersions).values(
    PRESET_UI_VERSIONS.map((preset) => ({
      surfaceId: "expense-dashboard",
      version: preset.version,
      name: preset.name,
      description: preset.description,
      messagesJson: JSON.stringify(preset.messages, null, 2),
      isActive: preset.version === 3 ? 1 : 0,
    })),
  );
});
