// Extracted verbatim from the original learning-app.html.
// Questions generated from small data tables (HTTP codes, ports, Big-O, chmod, CIDR...).
export function backendTemplates() {
  const out = [];
  const http = [
    [200, "OK", "הבקשה הצליחה.", "ok|הצליח|success", 1],
    [201, "Created", "משאב חדש נוצר בהצלחה (בדרך כלל אחרי POST).", "created|נוצר|יציר", 1],
    [204, "No Content", "הבקשה הצליחה ואין תוכן להחזיר.", "no content|אין תוכן|ללא תוכן|ריק", 2],
    [
      301,
      "Moved Permanently",
      "המשאב עבר לצמיתות לכתובת אחרת.",
      "moved permanently|permanent|לצמיתות|קבוע",
      2,
    ],
    [302, "Found", "הפניה זמנית לכתובת אחרת.", "found|זמני|temporar|redirect|הפני", 2],
    [
      304,
      "Not Modified",
      "המשאב לא השתנה מאז הגרסה שבמטמון של הלקוח.",
      "not modified|לא השתנה|cache|מטמון",
      2,
    ],
    [
      400,
      "Bad Request",
      "הבקשה לא תקינה (פורמט או פרמטרים שגויים).",
      "bad request|לא תקינ|שגוי|invalid",
      1,
    ],
    [401, "Unauthorized", "המשתמש לא מאומת.", "unauthori|לא מאומת|אימות|authentic|לא מחובר", 1],
    [
      403,
      "Forbidden",
      "המשתמש מאומת אך אין לו הרשאה.",
      "forbidden|אסור|אין הרשאה|הרשא|permission",
      1,
    ],
    [404, "Not Found", "המשאב לא נמצא.", "not found|לא נמצא|לא קיים", 1],
    [
      405,
      "Method Not Allowed",
      "המתודה (למשל DELETE) לא נתמכת עבור המשאב.",
      "method not allowed|מתודה|method",
      2,
    ],
    [409, "Conflict", "התנגשות עם המצב הנוכחי של המשאב.", "conflict|התנגש|קונפליקט", 2],
    [
      429,
      "Too Many Requests",
      "הלקוח שלח יותר מדי בקשות (Rate Limiting).",
      "too many|יותר מדי|rate|הגבל",
      2,
    ],
    [
      500,
      "Internal Server Error",
      "שגיאה כללית בשרת.",
      "internal|server error|שגיאת שרת|שגיאה בשרת|שרת",
      1,
    ],
    [
      502,
      "Bad Gateway",
      "שרת ביניים (Proxy/Gateway) קיבל תשובה לא תקינה מהשרת שמאחוריו.",
      "bad gateway|gateway|proxy|שער",
      2,
    ],
    [
      503,
      "Service Unavailable",
      "השירות לא זמין כרגע (עומס או תחזוקה).",
      "unavailable|לא זמין|עומס|תחזוק",
      2,
    ],
    [
      504,
      "Gateway Timeout",
      "שרת ביניים לא קיבל תשובה בזמן מהשרת שמאחוריו.",
      "timeout|זמן|time out|פסק זמן",
      2,
    ],
  ];
  http.forEach(([c, n, he, k, l]) =>
    out.push({
      id: "t-http-" + c,
      topic: "http",
      level: l,
      q: `מה המשמעות של קוד הסטטוס HTTP ${c}?`,
      a: `${c} ${n} — ${he}`,
      check: { type: "kw", keys: k },
    }),
  );

  const ports = [
    ["HTTP", 80, 1],
    ["HTTPS", 443, 1],
    ["SSH", 22, 1],
    ["PostgreSQL", 5432, 2],
    ["MySQL", 3306, 2],
    ["Redis", 6379, 2],
    ["MongoDB", 27017, 2],
    ["DNS", 53, 2],
    ["SMTP", 25, 2],
  ];
  ports.forEach(([s, p, l]) =>
    out.push({
      id: "t-port-" + s,
      topic: "net",
      level: l,
      q: `מהו פורט ברירת המחדל של ${s}?`,
      a: `${p}`,
      check: { type: "num", val: p },
    }),
  );

  const bigo = [
    ["גישה לאיבר לפי אינדקס במערך", "1"],
    ["חיפוש איבר במערך לא ממוין", "n"],
    ["חיפוש בינארי במערך ממוין", "logn"],
    ["הוספה לראש רשימה מקושרת", "1"],
    ["חיפוש מפתח ב-Hash Table (במקרה הממוצע)", "1"],
    ["חיפוש בעץ חיפוש בינארי מאוזן", "logn"],
    ["הוצאת המינימום מ-Min-Heap", "logn"],
    ["מיון Merge Sort", "nlogn"],
    ["Bubble Sort במקרה הגרוע", "n2"],
    ["push או pop במחסנית", "1"],
    ["קריאת המינימום ב-Min-Heap (בלי להוציא אותו)", "1"],
    ["BFS על גרף עם V צמתים ו-E קשתות", "v+e"],
  ];
  const pretty = {
    1: "O(1)",
    n: "O(n)",
    logn: "O(log n)",
    nlogn: "O(n log n)",
    n2: "O(n²)",
    "v+e": "O(V + E)",
  };
  bigo.forEach(([op, v], i) =>
    out.push({
      id: "t-bigo-" + i,
      topic: "ds",
      level: 2,
      q: `מהי סיבוכיות הזמן (Big-O) של: ${op}?`,
      a: pretty[v],
      check: { type: "bigo", val: v },
    }),
  );

  [7, 15, 31, 100, 1000, 1024, 1000000].forEach((n) => {
    const v = Math.floor(Math.log2(n)) + 1;
    out.push({
      id: "t-bsearch-" + n,
      topic: "ds",
      level: 3,
      q: `מהו המספר המקסימלי של השוואות בחיפוש בינארי במערך ממוין של ${n.toLocaleString("en-US")} איברים?`,
      a: `${v} — כי בכל שלב חוצים את הטווח, ולכן צריך ⌊log₂(n)⌋ + 1 השוואות לכל היותר.`,
      check: { type: "num", val: v },
    });
  });

  [
    ["rw-r--r--", 644],
    ["rw-------", 600],
    ["rwx------", 700],
    ["rwxr-x---", 750],
    ["rw-r-----", 640],
    ["r--r--r--", 444],
    ["rwxrwxrwx", 777],
    ["rwxr-xr-x", 755],
  ].forEach(([p, v]) =>
    out.push({
      id: "t-chmod-" + v,
      topic: "os",
      level: 2,
      q: `איזה ערך מספרי של chmod נותן את ההרשאות ${p}?`,
      a: `${v} — כל שלשה מחושבת כ-r=4, w=2, x=1 (בעלים, קבוצה, אחרים).`,
      check: { type: "num", val: v },
    }),
  );

  [16, 24, 25, 26, 27, 28, 29, 30].forEach((n) => {
    const v = 2 ** (32 - n);
    out.push({
      id: "t-cidr-" + n,
      topic: "net",
      level: 3,
      q: `כמה כתובות IP יש בסך הכול ברשת /${n} (IPv4)?`,
      a: `${v.toLocaleString("en-US")} — כי נשארים ${32 - n} ביטים למארחים, כלומר 2^${32 - n}. (מתוכן ${(v - 2).toLocaleString("en-US")} שמישות למארחים.)`,
      check: { type: "num", val: v },
    });
  });
  return out;
}
