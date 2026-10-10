import { useState, useRef } from 'react';

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [scriptData, setScriptData] = useState(null);

  const canvasRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const runAutomation = async () => {
    if (!topic.trim()) return alert("만화 주제를 입력해 주세요!");
    setLoading(true);
    setStatusText("1/3 단계: AI가 4컷 대본 기획 중...");

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: "한국 최신 웹툰", genre: "일상 개그", topic })
      });
      const scriptJson = await res.json();
      if (!scriptJson.success) throw new Error(scriptJson.error);

      const data = scriptJson.data;
      setScriptData(data);
      setStatusText("2/3 단계: 4컷 웹툰 그리기 진행 중 (약 15초)...");

      const imgPromises = data.cuts.map(cut =>
        fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: `${data.character_desc}, ${cut.prompt}`, style: "한국 웹툰" })
        }).then(r => r.json())
      );

      const imgResults = await Promise.all(imgPromises);
      setStatusText("3/3 단계: 한글 대사 오버레이 및 캔버스 합성 완료!");

      imgResults.forEach((res, idx) => {
        if (res.success) {
          drawCanvas(idx, res.imageUrl, data.cuts[idx].dialogue);
        }
      });

      setStatusText("✨ 모바일 웹툰 완성을 축하합니다!");
    } catch (e) {
      alert("오류 발생: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const drawCanvas = (index, imgUrl, text) => {
    const canvas = canvasRefs[index].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      ctx.drawImage(img, 0, 0, 400, 400);

      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(15, 15, 370, 65, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#000";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, 200, 52);
    };
  };

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "16px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "20px", color: "#FF6B35", textAlign: "center" }}>📱 4컷 만화 생성기 Mobile</h1>
      <div style={{ background: "#FAF8ED", padding: "16px", borderRadius: "16px", marginBottom: "20px" }}>
        <textarea
          rows={3}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예: 오늘 아침 지하철 놓치고 미친 듯이 달린 썰"
          style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #CCC", boxSizing: "border-box" }}
        />
        <button
          onClick={runAutomation}
          disabled={loading}
          style={{ width: "100%", padding: "14px", background: loading ? "#CCC" : "#FF6B35", color: "#FFF", fontSize: "16px", fontWeight: "bold", border: "none", borderRadius: "10px", marginTop: "10px" }}
        >
          {loading ? "⚡ 만화 자동 생성 중..." : "🚀 1클릭 만화 생성하기"}
        </button>
        {statusText && <p style={{ textAlign: "center", fontSize: "13px", color: "#4A53E0", fontWeight: "bold", marginTop: "10px" }}>{statusText}</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} style={{ border: "2px solid #222", borderRadius: "12px", overflow: "hidden", background: "#F5F5F5" }}>
            <canvas ref={canvasRefs[idx]} style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
