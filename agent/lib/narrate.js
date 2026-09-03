'use strict';

const Anthropic = require('@anthropic-ai/sdk');

/**
 * Tầng viết chữ. Model chỉ được diễn giải bộ số harness đưa xuống.
 *
 * SYSTEM PROMPT PHẢI ĐỨNG YÊN TỪNG BYTE. Không ngày tháng, không tên shop,
 * không id phiên — hễ nhét vào là cache vỡ và mỗi lần chạy trả tiền đầu vào đầy đủ.
 * Mọi thứ thay đổi theo lần chạy nằm ở user message.
 */
const SYSTEM_PROMPT = `Bạn là người phân tích vận hành cho một agency thương mại điện tử tại Việt Nam.

Bạn nhận một khối JSON tên "figures" chứa số liệu đã được tính sẵn bằng code, và viết một bản tóm tắt vận hành bằng tiếng Việt.

Luật cứng:
1. Chỉ được dùng những con số có mặt trong khối figures. Không tự cộng, trừ, nhân, chia, không ước lượng, không làm tròn thành số khác.
2. Cần một con số mà figures không có thì nói thẳng là không có, đừng suy ra.
3. changePct bằng null nghĩa là không có kỳ trước để so. Viết "không có kỳ trước để so", đừng viết là không đổi.
4. Không khuyến nghị tăng giảm ngân sách quảng cáo hay đổi giá. Bản này chỉ mô tả và chỉ ra chỗ bất thường.

Bố cục:
- Một đoạn mở, tối đa ba câu, trả lời: kỳ này lãi hay lỗ sau quảng cáo, và điều gì đáng chú ý nhất.
- Mục "Số liệu": các chỉ số chính kèm mức thay đổi so với kỳ trước.
- Mục "Bất thường": tối đa ba điểm, mỗi điểm một dòng, kèm con số chứng minh. Không có thì ghi "Không có điểm nào vượt ngưỡng".
- Mục "Cần người xem lại": việc cụ thể cho người vận hành, hoặc "Không có".

Viết gọn, xuống dòng rõ ràng. Không mở bài khách sáo, không tổng kết lại ở cuối.`;

const DEFAULT_MODEL = 'claude-opus-5';

/**
 * Gọi Claude để viết phần chữ.
 * @returns {Promise<{text: string, usage: object, model: string}>}
 */
async function narrate(figures, options = {}) {
  const {
    client = new Anthropic(),
    model = process.env.AGENT_MODEL || DEFAULT_MODEL,
    effort = process.env.AGENT_EFFORT || undefined,
    maxTokens = 16000,
  } = options;

  const request = {
    model,
    max_tokens: maxTokens,
    thinking: { type: 'adaptive' },
    // Bộ nhớ đệm bám vào system prompt tĩnh; phần thay đổi nằm sau nó.
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: `figures:\n${JSON.stringify(figures, null, 2)}`,
      },
    ],
    // Bản phân tích kinh doanh gần như không thể bị từ chối, nhưng bật sẵn thì
    // một lần từ chối không làm hỏng cả lượt chạy theo lịch.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  };
  if (effort) request.output_config = { effort };

  const response = await client.beta.messages.create(request);

  if (response.stop_reason === 'refusal') {
    const detail = response.stop_details || {};
    throw new Error(
      `Model từ chối viết báo cáo (${detail.category || 'không rõ nhóm'}): ${detail.explanation || ''}`,
    );
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!text) throw new Error('Model trả về rỗng, không có khối text nào.');

  return { text, usage: response.usage, model: response.model };
}

module.exports = { SYSTEM_PROMPT, DEFAULT_MODEL, narrate };
