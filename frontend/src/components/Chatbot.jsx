import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/* ═══════════════════════════════════════════════════════════
   KNOWLEDGE BASE — all Q&A pairs with keywords for matching
   ═══════════════════════════════════════════════════════════ */
const TOPICS = [
  {
    id: "order",
    icon: "📦",
    label: "Order Placement",
    greeting: "I can help you place an order! Here are some common questions, or feel free to type your own:",
  },
  {
    id: "tracking",
    icon: "🚚",
    label: "Order Tracking",
    greeting: "Let me help you track your order! Here are some common questions:",
  },
  {
    id: "shipping",
    icon: "✈️",
    label: "Shipping & Delivery",
    greeting: "Here's everything about our shipping! Pick a question or ask me anything:",
  },
  {
    id: "returns",
    icon: "🔄",
    label: "Returns & Refunds",
    greeting: "Let me explain our return policy! Ask me anything:",
  },
  {
    id: "account",
    icon: "👤",
    label: "Account & Profile",
    greeting: "I can help with your account! Here are common questions:",
  },
  {
    id: "general",
    icon: "💎",
    label: "About Trendz",
    greeting: "Here's some info about Trendz! Feel free to ask me anything:",
  },
];

const KNOWLEDGE_BASE = [
  // ─── Order Placement ───
  {
    topic: "order",
    q: "How do I place an order?",
    a: "Browse our collections, add items to your cart, then proceed to checkout. You can pay via UPI, card, or Cash on Delivery (where available).",
    keywords: ["place", "order", "buy", "purchase", "how to order", "ordering", "checkout", "how to buy"],
  },
  {
    topic: "order",
    q: "Can I modify my order after placing it?",
    a: "Orders can be modified within 30 minutes of placement. After that, you'll need to cancel and reorder. Go to **Account → Orders** to manage.",
    keywords: ["modify", "change", "edit", "update", "order", "after placing", "alter"],
  },
  {
    topic: "order",
    q: "What payment methods do you accept?",
    a: "We accept UPI, Credit/Debit cards, Net Banking, and Cash on Delivery (COD). COD availability depends on your pincode.",
    keywords: ["payment", "pay", "method", "upi", "card", "credit", "debit", "net banking", "how to pay", "accept"],
  },
  {
    topic: "order",
    q: "Is COD available in my area?",
    a: "COD availability varies by pincode. Enter your pincode on the product page or at checkout to check availability.",
    keywords: ["cod", "cash on delivery", "cash", "available", "area", "pincode", "my area"],
  },
  {
    topic: "order",
    q: "How do I apply a coupon code?",
    a: 'Enter your coupon code at checkout in the "Apply Coupon" field. Active codes: **TRENDY10** (10% off ₹5k+), **FIRST500** (₹500 off), **TRENDY20** (20% off ₹15k+).',
    keywords: ["coupon", "code", "discount", "promo", "offer", "apply", "voucher", "promotional"],
  },
  {
    topic: "order",
    q: "How do I cancel my order?",
    a: "You can cancel your order from **Account → Orders** page. Click on the order and select 'Cancel Order'. Cancellation is free if the order hasn't shipped yet.",
    keywords: ["cancel", "cancellation", "cancel order", "stop order", "don't want"],
  },

  // ─── Order Tracking ───
  {
    topic: "tracking",
    q: "How do I track my order?",
    a: "Go to **Account → Orders** to see real-time status updates for all your orders.",
    keywords: ["track", "tracking", "where", "status", "my order", "order status", "find order"],
  },
  {
    topic: "tracking",
    q: "What do the order statuses mean?",
    a: "• **Processing** — We're preparing your order\n• **Shipped** — On its way to you\n• **Out for Delivery** — Arriving today\n• **Delivered** — Successfully delivered\n• **Cancelled** — Order was cancelled",
    keywords: ["status", "statuses", "mean", "processing", "shipped", "delivered", "out for delivery", "what does"],
  },
  {
    topic: "tracking",
    q: "My order is delayed, what should I do?",
    a: "Deliveries typically arrive within 2-4 business days. If it's been longer, please check your order status in **Account → Orders** or contact us at support@trendy.com.",
    keywords: ["delay", "delayed", "late", "not arrived", "not received", "still waiting", "taking long", "where is my order", "haven't received"],
  },
  {
    topic: "tracking",
    q: "I received a damaged item",
    a: "We're sorry about that! Go to **Account → Orders** → select the order → **Request Return**. Our team will process a replacement or refund within 48 hours.",
    keywords: ["damaged", "broken", "defective", "wrong", "item", "received wrong", "faulty", "not working", "quality"],
  },

  // ─── Shipping & Delivery ───
  {
    topic: "shipping",
    q: "What are the shipping charges?",
    a: "We offer **FREE shipping** on all orders above ₹2,000. Orders below ₹2,000 have a flat ₹99 shipping fee.",
    keywords: ["shipping", "charge", "charges", "cost", "fee", "delivery charge", "free shipping", "shipping cost", "how much shipping"],
  },
  {
    topic: "shipping",
    q: "How long does delivery take?",
    a: "Standard delivery takes **2-4 business days** depending on your location. Metro cities usually receive orders within 2 days.",
    keywords: ["how long", "delivery time", "days", "when", "arrive", "time", "how many days", "delivery take", "estimated"],
  },
  {
    topic: "shipping",
    q: "Do you deliver to my pincode?",
    a: "Check delivery availability by entering your pincode on any product page. We serve **500+ serviceable areas** across India.",
    keywords: ["deliver", "pincode", "my area", "my city", "serviceable", "available", "my location", "ship to"],
  },
  {
    topic: "shipping",
    q: "Can I change my delivery address?",
    a: "You can update the delivery address before the order is shipped. Go to **Account → Orders** and edit the shipping details.",
    keywords: ["change address", "delivery address", "update address", "wrong address", "address change", "different address"],
  },

  // ─── Returns & Refunds ───
  {
    topic: "returns",
    q: "What is your return policy?",
    a: "We offer a **7-day easy return** policy for all products. Items must be unused and in original packaging with tags attached.",
    keywords: ["return policy", "return", "policy", "returnable", "can i return", "return product"],
  },
  {
    topic: "returns",
    q: "How do I initiate a return?",
    a: "Go to **Account → Orders** → select the order → click **'Request Return'**. Choose your reason and our pickup team will collect the item.",
    keywords: ["initiate", "return", "start return", "how to return", "request return", "return process", "send back"],
  },
  {
    topic: "returns",
    q: "When will I receive my refund?",
    a: "Refunds are processed within **5-7 business days** after we receive and verify the returned item. Amount is credited to your original payment method.",
    keywords: ["refund", "money back", "when refund", "refund status", "get refund", "credit back", "refund time"],
  },
  {
    topic: "returns",
    q: "Can I exchange instead of return?",
    a: "Currently, we process returns and you can place a new order for the desired item. This ensures faster processing.",
    keywords: ["exchange", "swap", "replace", "instead", "different size", "different color", "replacement"],
  },

  // ─── Account & Profile ───
  {
    topic: "account",
    q: "How do I create an account?",
    a: "Click **'Sign Up'** in the navigation bar. You'll need your name, email, and a password. It takes less than a minute!",
    keywords: ["create", "account", "sign up", "register", "new account", "join", "registration", "signup"],
  },
  {
    topic: "account",
    q: "I forgot my password",
    a: "Click **'Forgot Password'** on the login page. We'll send a reset link to your registered email address.",
    keywords: ["forgot", "password", "reset", "can't login", "login problem", "forgot password", "lost password", "reset password"],
  },
  {
    topic: "account",
    q: "How do I update my profile?",
    a: "Go to **Account** page and click the edit icon next to your profile information. You can update your name, email, and phone number.",
    keywords: ["update", "profile", "edit profile", "change name", "change email", "change phone", "update details", "my profile"],
  },
  {
    topic: "account",
    q: "How do I manage my addresses?",
    a: "Go to **Account → Addresses** tab. You can add, edit, or delete delivery addresses and set a default address.",
    keywords: ["address", "addresses", "manage", "add address", "edit address", "delete address", "default address", "saved address"],
  },

  // ─── About Trendz ───
  {
    topic: "general",
    q: "What does Trendz sell?",
    a: "Trendz is a premium lifestyle brand offering curated **watches, eyewear, footwear, accessories, shirts, pants, and grooming** products.",
    keywords: ["what", "sell", "products", "categories", "trendz", "about", "what do you sell", "what is trendz", "brand"],
  },
  {
    topic: "general",
    q: "Are your products authentic?",
    a: "**100% authentic.** Every product comes with a certificate of authenticity and brand warranty. We source directly from brands and authorized distributors.",
    keywords: ["authentic", "genuine", "real", "fake", "original", "quality", "trust", "warranty", "certified"],
  },
  {
    topic: "general",
    q: "Do you have physical stores?",
    a: "Trendz is currently an **online-exclusive** brand, allowing us to offer premium products at competitive prices by cutting retail overhead.",
    keywords: ["store", "physical", "shop", "offline", "location", "visit", "showroom", "retail", "brick"],
  },
  {
    topic: "general",
    q: "How do I contact customer support?",
    a: "You can reach us via:\n• **Email:** support@trendy.com\n• **Phone:** 1800-TRENDY-HELP (toll-free)\n• **This chat** — available 24/7!",
    keywords: ["contact", "support", "help", "customer service", "email", "phone", "call", "reach", "talk", "human", "agent", "speak"],
  },

  // ─── Additional common questions ───
  {
    topic: "general",
    q: "Do you have any offers right now?",
    a: "Yes! Here are our active coupon codes:\n• **TRENDY10** — 10% off on orders above ₹5,000\n• **FIRST500** — ₹500 off on your first order\n• **TRENDY20** — 20% off on orders above ₹15,000\n\nApply them at checkout!",
    keywords: ["offer", "offers", "deal", "deals", "sale", "promotion", "discount", "any offer", "current offer"],
  },
  {
    topic: "general",
    q: "Is my data safe with Trendz?",
    a: "Absolutely! We use **SSL encryption** for all transactions and never share your personal data with third parties. Your privacy is our priority.",
    keywords: ["data", "safe", "privacy", "secure", "security", "information", "personal data", "ssl", "encrypted"],
  },
  {
    topic: "shipping",
    q: "Do you ship internationally?",
    a: "Currently, we ship only within **India**. We're working on expanding to international markets soon. Stay tuned!",
    keywords: ["international", "abroad", "outside india", "overseas", "foreign", "other country", "global", "worldwide"],
  },
];

/* ─── Greeting messages for different times of day ─── */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning! ☀️";
  if (hour < 17) return "Good afternoon! 👋";
  if (hour < 21) return "Good evening! 🌆";
  return "Hi there! 🌙";
}

/* ─── Smart keyword matching engine ─── */
function findBestAnswer(userInput) {
  const input = userInput.toLowerCase().trim();

  // Score each knowledge base entry
  const scored = KNOWLEDGE_BASE.map((entry) => {
    let score = 0;

    // Check keyword matches
    for (const keyword of entry.keywords) {
      if (input.includes(keyword.toLowerCase())) {
        // Longer keyword matches are worth more
        score += keyword.split(" ").length * 2;
      }
    }

    // Check if user input words appear in the question
    const inputWords = input.split(/\s+/).filter((w) => w.length > 2);
    const questionLower = entry.q.toLowerCase();
    for (const word of inputWords) {
      if (questionLower.includes(word)) {
        score += 1;
      }
    }

    return { ...entry, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return top match if score is good enough
  if (scored[0] && scored[0].score >= 2) {
    return {
      answer: scored[0].a,
      topic: scored[0].topic,
      confidence: "high",
    };
  }

  // Check for partial match
  if (scored[0] && scored[0].score >= 1) {
    return {
      answer: scored[0].a,
      topic: scored[0].topic,
      confidence: "medium",
    };
  }

  return null;
}

/* ─── Handle common greetings and small talk ─── */
function handleSmallTalk(input) {
  const lower = input.toLowerCase().trim();

  const greetings = ["hi", "hello", "hey", "hii", "hiii", "good morning", "good afternoon", "good evening", "howdy", "sup", "yo"];
  if (greetings.some((g) => lower === g || lower === g + "!") || lower.match(/^(hi|hello|hey)\b/)) {
    return `${getGreeting()} Welcome to **Trendz** support! How can I help you today? You can ask me about orders, shipping, returns, your account, or anything else! 😊`;
  }

  const thanks = ["thanks", "thank you", "thank u", "thx", "ty", "appreciate"];
  if (thanks.some((t) => lower.includes(t))) {
    return "You're welcome! 😊 Is there anything else I can help you with? Feel free to ask anytime!";
  }

  const byes = ["bye", "goodbye", "see you", "later", "take care"];
  if (byes.some((b) => lower.includes(b))) {
    return "Goodbye! 👋 Thank you for chatting with **Trendz** support. Have a wonderful day! We're here 24/7 if you need us.";
  }

  const okays = ["ok", "okay", "got it", "understood", "alright", "fine", "cool", "nice"];
  if (okays.some((o) => lower === o || lower === o + "!")) {
    return "Great! 👍 Let me know if you have any other questions. I'm here to help!";
  }

  return null;
}

/* ─── Helper: Typing Indicator ─── */
function TypingDots() {
  return (
    <div className="chatbot-typing">
      <span className="chatbot-dot" style={{ animationDelay: "0s" }} />
      <span className="chatbot-dot" style={{ animationDelay: "0.15s" }} />
      <span className="chatbot-dot" style={{ animationDelay: "0.3s" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN CHATBOT COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [pulse, setPulse] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  /* Focus input when chat opens */
  useEffect(() => {
    if (isOpen) {
      setPulse(false);
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen]);

  /* Auto-greet badge after 5s */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setHasUnread(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  /* ─── Core message functions ─── */
  const addBotMessage = useCallback((text, options = {}) => {
    setIsTyping(true);
    const delay = Math.min(text.length * 6, 1200);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { type: "bot", text, time: new Date(), ...options },
      ]);
      setIsTyping(false);
    }, delay);
  }, []);

  const addUserMessage = useCallback((text) => {
    setMessages((prev) => [
      ...prev,
      { type: "user", text, time: new Date() },
    ]);
  }, []);

  /* ─── Welcome message ─── */
  const showWelcome = useCallback(() => {
    const greeting = getGreeting();
    setTimeout(() => {
      setMessages([
        {
          type: "bot",
          text: `${greeting} Welcome to **Trendz** customer support.\n\nI'm here to help you with orders, shipping, returns, and more. You can pick a topic below or just type your question!`,
          time: new Date(),
          showTopics: true,
        },
      ]);
    }, 300);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
    if (messages.length === 0) {
      showWelcome();
    }
  };

  /* ─── Handle user typing a free-form question ─── */
  const handleSendMessage = () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    setInputValue("");
    addUserMessage(text);

    setTimeout(() => {
      // 1. Check for small talk
      const smallTalkReply = handleSmallTalk(text);
      if (smallTalkReply) {
        addBotMessage(smallTalkReply);
        return;
      }

      // 2. Search knowledge base
      const match = findBestAnswer(text);
      if (match) {
        if (match.confidence === "medium") {
          addBotMessage(
            `I think this might answer your question:\n\n${match.answer}\n\nIf this wasn't what you were looking for, try rephrasing or pick a topic below!`,
            { showTopics: true }
          );
        } else {
          addBotMessage(match.answer, { showAskMore: true });
        }
        return;
      }

      // 3. No match — friendly fallback with suggestions
      addBotMessage(
        "I'm not sure I understood that correctly. 🤔 Let me show you the topics I can help with — or try asking in a different way!\n\nYou can ask about:\n• Orders & payments\n• Shipping & delivery\n• Returns & refunds\n• Account & profile\n• About Trendz",
        { showTopics: true }
      );
    }, 200);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /* ─── Topic & question clicks ─── */
  const handleTopicSelect = (topic) => {
    addUserMessage(topic.label);
    const topicQuestions = KNOWLEDGE_BASE.filter((kb) => kb.topic === topic.id);
    setTimeout(() => {
      addBotMessage(topic.greeting, {
        showQuestions: topicQuestions.map((kb) => ({
          q: kb.q,
          a: kb.a,
          topic: kb.topic,
        })),
      });
    }, 200);
  };

  const handleQuestionSelect = (qa) => {
    addUserMessage(qa.q);
    setTimeout(() => {
      addBotMessage(qa.a, { showAskMore: true });
    }, 200);
  };

  const handleBackToTopics = () => {
    addUserMessage("Show me other topics");
    setTimeout(() => {
      addBotMessage("Sure! What else can I help you with? Pick a topic or type your question:", {
        showTopics: true,
      });
    }, 200);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleReset = () => {
    setMessages([]);
    setInputValue("");
    showWelcome();
  };

  /* ─── Render helpers ─── */
  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const renderText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="text-[#d4af37] font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part.split("\n").map((line, j) => (
        <span key={`${i}-${j}`}>
          {j > 0 && <br />}
          {line}
        </span>
      ));
    });
  };

  return (
    <>
      {/* ─── Chat Toggle Button ─── */}
      <button
        id="chatbot-toggle"
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        className={`chatbot-toggle ${isOpen ? "chatbot-toggle--open" : ""} ${pulse ? "chatbot-pulse" : ""}`}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            {hasUnread && <span className="chatbot-badge" />}
          </>
        )}
      </button>

      {/* ─── Chat Window ─── */}
      <div className={`chatbot-window ${isOpen ? "chatbot-window--open" : ""}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar">
              <span className="display text-sm font-bold">T</span>
              <span className="chatbot-online-dot" />
            </div>
            <div>
              <h3 className="chatbot-header-title display">Trendz Support</h3>
              <p className="chatbot-header-status">
                <span className="chatbot-status-dot" />
                Always online
              </p>
            </div>
          </div>
          <div className="chatbot-header-actions">
            <button onClick={handleReset} className="chatbot-header-btn" title="New conversation" aria-label="New conversation">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
              </svg>
            </button>
            <button onClick={() => setIsOpen(false)} className="chatbot-header-btn" title="Minimize" aria-label="Minimize chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chatbot-msg chatbot-msg--${msg.type}`}>
              {msg.type === "bot" && (
                <div className="chatbot-msg-avatar">
                  <span className="display text-[10px] font-bold">T</span>
                </div>
              )}
              <div className={`chatbot-bubble chatbot-bubble--${msg.type}`}>
                <p className="chatbot-bubble-text">{renderText(msg.text)}</p>
                <span className="chatbot-bubble-time">{formatTime(msg.time)}</span>

                {/* Topic Suggestion Buttons */}
                {msg.showTopics && (
                  <div className="chatbot-options">
                    {TOPICS.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => handleTopicSelect(topic)}
                        className="chatbot-option-btn"
                      >
                        <span className="chatbot-option-icon">{topic.icon}</span>
                        {topic.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Question Buttons (when a topic is selected) */}
                {msg.showQuestions && (
                  <div className="chatbot-options">
                    {msg.showQuestions.map((qa, j) => (
                      <button
                        key={j}
                        onClick={() => handleQuestionSelect(qa)}
                        className="chatbot-question-btn"
                      >
                        {qa.q}
                      </button>
                    ))}
                    <button onClick={handleBackToTopics} className="chatbot-back-btn">
                      ← Back to topics
                    </button>
                  </div>
                )}

                {/* "Ask more" follow-up after an answer */}
                {msg.showAskMore && (
                  <div className="chatbot-options">
                    <div className="chatbot-askmore-label">Was this helpful? Ask me another question or:</div>
                    <button onClick={handleBackToTopics} className="chatbot-back-btn">
                      ← Browse all topics
                    </button>
                    <div className="chatbot-quick-actions">
                      <button onClick={() => handleNavigate("/shop")} className="chatbot-action-btn">
                        🛍️ Browse Shop
                      </button>
                      <button onClick={() => handleNavigate("/account")} className="chatbot-action-btn">
                        👤 My Account
                      </button>
                      <button onClick={() => handleNavigate("/cart")} className="chatbot-action-btn">
                        🛒 View Cart
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="chatbot-msg chatbot-msg--bot">
              <div className="chatbot-msg-avatar">
                <span className="display text-[10px] font-bold">T</span>
              </div>
              <div className="chatbot-bubble chatbot-bubble--bot">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── Input Area ─── */}
        <div className="chatbot-input-area">
          <div className="chatbot-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              className="chatbot-input"
              disabled={isTyping}
              id="chatbot-input"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="chatbot-send-btn"
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
          <div className="chatbot-input-hint">
            Press Enter to send · Powered by <span className="gold">Trendz</span>
          </div>
        </div>
      </div>
    </>
  );
}
