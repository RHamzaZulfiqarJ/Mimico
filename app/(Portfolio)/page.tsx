"use client"

import { motion, useScroll, useTransform, useSpring } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  Share2,
  Sparkles,
  Zap,
  BarChart3,
  ChevronRight,
  MessageSquare,
  Mail,
  Github,
  Twitter,
  Linkedin,
  Check,
  Users,
  Play,
  Star,
  ArrowRight,
} from "lucide-react"

export default function LandingPage() {
  const router = useRouter()

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const { scrollYProgress } = useScroll()
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const scaleProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  const features = [
    {
      title: "AI Copywriting",
      desc: "Gemini-powered captions that convert followers into customers instantly.",
      icon: Sparkles,
      color: "text-purple-400",
    },
    {
      title: "Smart Scheduling",
      desc: "Post at the exact moment your audience is most active globally.",
      icon: Zap,
      color: "text-amber-400",
    },
    {
      title: "Deep Analytics",
      desc: "Visualize growth patterns with enterprise-grade chart intelligence.",
      icon: BarChart3,
      color: "text-blue-400",
    },
    {
      title: "Unified Inbox",
      desc: "Manage every interaction across all platforms in one smooth stream.",
      icon: MessageSquare,
      color: "text-emerald-400",
    },
  ]

  const steps = [
    { number: "01", title: "Connect Accounts", desc: "Securely link your social platforms." },
    { number: "02", title: "Generate & Polish", desc: "Create content with AI assistance." },
    { number: "03", title: "Automated Growth", desc: "Publish at peak engagement time." },
  ]

  const pricing = [
    { name: "Starter", price: "Free", features: ["3 Profiles", "Basic AI", "Weekly Reports"] },
    {
      name: "Growth",
      price: "$49",
      popular: true,
      features: ["10 Profiles", "Unlimited AI", "Daily Analytics"],
    },
    {
      name: "Enterprise",
      price: "$199",
      features: ["Unlimited", "Custom Models", "Priority Support"],
    },
  ]

  return (
    <div className="relative">

      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-purple-600 origin-left z-[110]"
        style={{ scaleX: scaleProgress }}
      />

      {/* ================= NAVBAR ================= */}
      <nav className="fixed top-0 left-0 right-0 h-20 glass z-[100] border-b border-white/5 px-8 flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Share2 className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-white">SproutPulse</span>
        </div>

        <div className="hidden md:flex gap-8 text-sm text-gray-400">
          <a href="#home" onClick={(e) => scrollToSection(e, "home")}>Home</a>
          <a href="#about" onClick={(e) => scrollToSection(e, "about")}>About</a>
          <a href="#features" onClick={(e) => scrollToSection(e, "features")}>Features</a>
          <a href="#pricing" onClick={(e) => scrollToSection(e, "pricing")}>Pricing</a>
          <a href="#contact" onClick={(e) => scrollToSection(e, "contact")}>Contact</a>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/login")}
            className="text-gray-300 hover:text-white"
          >
            Log In
          </button>

          <button
            onClick={() => router.push("/signup")}
            className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold"
          >
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="min-h-screen pt-32 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
        <motion.div 
          style={{ y: backgroundY, opacity: opacityHero }}
          className="absolute inset-0 pointer-events-none -z-10"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-[10%] left-[10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[100px]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl"
        >
          <motion.span 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-widest mb-6 inline-block"
          >
            The #1 AI Social Dashboard
          </motion.span>
          <h1 className="text-6xl md:text-9xl font-black text-white leading-[0.9] mb-8 tracking-tighter">
            GROW YOUR <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
              AUDIENCE FASTER.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            Unleash the power of AI to create content that captivates. SproutPulse is the premium operating system for modern creators.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <button 
              onClick={() => router.push('signup')}
              className="w-full md:w-auto px-12 py-6 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl shadow-2xl shadow-purple-600/30 transition-all active:scale-95 text-xl"
            >
              Start Your Free Trial
            </button>
            <button className="w-full md:w-auto px-12 py-6 glass border-white/10 hover:bg-white/5 text-white font-bold rounded-2xl transition-all text-xl flex items-center justify-center gap-3">
              Watch Demo <Play className="w-5 h-5 fill-current" />
            </button>
          </div>
        </motion.div>

        {/* Floating Mockup Preview */}
        <motion.div
          initial={{ opacity: 0, y: 150 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, type: 'spring', bounce: 0.3 }}
          className="mt-32 w-full max-w-7xl mx-auto glass rounded-t-3xl border-t border-x border-white/10 p-4 shadow-[0_-40px_100px_rgba(139,92,246,0.2)] overflow-hidden h-[500px]"
        >
          <div className="bg-gray-950/90 rounded-t-2xl w-full h-full p-8 overflow-hidden relative">
             <div className="flex gap-2 mb-8">
               <div className="w-3 h-3 rounded-full bg-rose-500/40"></div>
               <div className="w-3 h-3 rounded-full bg-amber-500/40"></div>
               <div className="w-3 h-3 rounded-full bg-emerald-500/40"></div>
             </div>
             <div className="grid grid-cols-12 gap-8">
                <div className="col-span-3 space-y-6">
                  <div className="h-4 bg-white/5 rounded w-3/4"></div>
                  <div className="h-12 bg-purple-600/20 rounded-xl w-full border border-purple-500/30"></div>
                  <div className="h-12 bg-white/5 rounded-xl w-full"></div>
                  <div className="h-12 bg-white/5 rounded-xl w-full"></div>
                  <div className="h-12 bg-white/5 rounded-xl w-full"></div>
                </div>
                <div className="col-span-9 space-y-8">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="h-32 bg-white/5 rounded-2xl w-full border border-white/5 p-4 flex flex-col justify-center">
                       <div className="w-8 h-8 rounded bg-purple-500/20 mb-3"></div>
                       <div className="h-2 bg-white/10 w-full rounded"></div>
                    </div>
                    <div className="h-32 bg-white/5 rounded-2xl w-full border border-white/5 p-4 flex flex-col justify-center">
                       <div className="w-8 h-8 rounded bg-blue-500/20 mb-3"></div>
                       <div className="h-2 bg-white/10 w-full rounded"></div>
                    </div>
                    <div className="h-32 bg-white/5 rounded-2xl w-full border border-white/5 p-4 flex flex-col justify-center">
                       <div className="w-8 h-8 rounded bg-emerald-500/20 mb-3"></div>
                       <div className="h-2 bg-white/10 w-full rounded"></div>
                    </div>
                  </div>
                  <div className="h-64 bg-white/[0.02] rounded-3xl w-full border border-white/5 p-8 relative overflow-hidden">
                     <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-purple-600/10 to-transparent"></div>
                     <BarChart3 className="w-16 h-16 text-purple-500/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                </div>
             </div>
          </div>
        </motion.div>
      </section>

      {/* Social Proof Marquee */}
      <div className="py-20 border-y border-white/5 bg-gray-950 flex flex-col items-center overflow-hidden">
        <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-gray-500 mb-10">Trusted by over 10,000+ brands</p>
        <div className="flex gap-20 items-center opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
           {['VELOCITY', 'AURORA', 'LUMINA', 'PULSE', 'STARK', 'NEXUS'].map((brand) => (
             <span key={brand} className="text-3xl font-black text-white tracking-widest">{brand}</span>
           ))}
        </div>
      </div>

      {/* About Section */}
      <section id="about" className="py-40 px-4 bg-gray-950/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-10"
            >
              <h2 className="text-5xl md:text-7xl font-bold text-white leading-tight">
                Built for those <br /> 
                <span className="text-purple-500">Who Execute.</span>
              </h2>
              <p className="text-gray-400 text-xl leading-relaxed font-light">
                We believe content creation should be effortless. That's why we've stripped away the noise and built a workspace focused on flow, performance, and intelligent automation.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                   <h4 className="text-3xl font-black text-white">99%</h4>
                   <p className="text-gray-500 text-sm uppercase tracking-widest font-bold">Accuracy</p>
                </div>
                <div className="space-y-2">
                   <h4 className="text-3xl font-black text-white">12x</h4>
                   <p className="text-gray-500 text-sm uppercase tracking-widest font-bold">Faster Output</p>
                </div>
              </div>
              <button className="flex items-center gap-3 text-white font-bold group">
                Learn more about our vision <ArrowRight className="w-5 h-5 text-purple-500 group-hover:translate-x-2 transition-transform" />
              </button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
               <div className="aspect-square glass rounded-[60px] border border-white/5 overflow-hidden flex items-center justify-center p-12">
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 border-[2px] border-dashed border-purple-500/10 rounded-full scale-110"
                  />
                  <div className="relative z-10 text-center">
                    <Users className="w-24 h-24 text-purple-500 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(139,92,246,0.4)]" />
                    <p className="text-white font-bold text-2xl">Collaborative Spirit</p>
                    <p className="text-gray-500 text-sm mt-2">Scale with your team seamlessly.</p>
                  </div>
               </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-40 px-4">
        <div className="max-w-7xl mx-auto text-center mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-8xl font-black text-white mb-8"
          >
            Power tools for <br /> modern brands.
          </motion.h2>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto font-light">Stop jumping between tabs. One ecosystem to rule your digital footprint.</p>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -12, backgroundColor: 'rgba(255,255,255,0.02)' }}
              className="glass p-10 rounded-[40px] border border-white/5 hover:border-purple-500/40 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:bg-purple-600/20 transition-all group-hover:rotate-6">
                <f.icon className={`w-8 h-8 ${f.color}`} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 transition-colors">{f.title}</h3>
              <p className="text-gray-500 leading-relaxed font-light">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-40 px-4 bg-gray-950/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-black text-white mb-4">Three steps to dominance.</h2>
            <p className="text-gray-500">It's simple, it's fast, it's SproutPulse.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative group p-8"
              >
                <div className="text-8xl font-black text-white/5 absolute top-0 left-0 leading-none group-hover:text-purple-600/10 transition-colors">
                   {step.number}
                </div>
                <div className="relative z-10">
                   <h3 className="text-2xl font-bold text-white mb-4 mt-8">{step.title}</h3>
                   <p className="text-gray-400 font-light leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-40 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-black text-white mb-4">Transparent Pricing.</h2>
            <p className="text-gray-500">Choose the plan that fits your ambition.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {pricing.map((p, i) => (
               <motion.div
                 key={i}
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 className={`p-10 rounded-[40px] border flex flex-col ${p.popular ? 'bg-purple-600 border-purple-400 shadow-2xl shadow-purple-600/30' : 'glass border-white/5'}`}
               >
                 <div className="mb-8">
                   <h4 className={`text-xl font-bold ${p.popular ? 'text-white' : 'text-gray-400'}`}>{p.name}</h4>
                   <p className="text-4xl font-black text-white mt-2">{p.price}</p>
                   {p.price !== 'Free' && <span className="text-xs text-white/60">per month</span>}
                 </div>
                 <ul className="space-y-4 mb-10 flex-1">
                   {p.features.map((f) => (
                     <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                        <Check className="w-4 h-4" /> {f}
                     </li>
                   ))}
                 </ul>
                 <button className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-95 ${p.popular ? 'bg-white text-purple-600 hover:bg-gray-100' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                    Choose {p.name}
                 </button>
               </motion.div>
             ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-40 px-4 bg-purple-600/5 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="flex gap-1 mb-8">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 fill-purple-500 text-purple-500" />)}
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-medium text-white text-center max-w-4xl italic leading-tight"
          >
            "SproutPulse changed the game for us. We went from posting twice a week to twice a day without adding any headcount. The AI generator is like magic."
          </motion.p>
          <div className="mt-12 flex items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 p-1">
                <img src="https://picsum.photos/seed/ceo/100/100" className="w-full h-full rounded-full object-cover" alt="Client" />
             </div>
             <div className="text-left">
                <p className="text-white font-bold">Marcus Chen</p>
                <p className="text-purple-400 text-sm font-medium">CEO at TechVanguard</p>
             </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-40 px-4 relative overflow-hidden">
        <div className="max-w-5xl mx-auto glass p-16 rounded-[60px] border border-white/10 shadow-2xl relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] -z-10" />
          <div className="text-center mb-16">
            <h2 className="text-6xl font-black text-white mb-6">Let's Connect.</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">Ready to accelerate your digital growth? Our experts are standing by.</p>
          </div>
          <form className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Your Name</label>
                <input type="text" placeholder="John Wick" className="w-full bg-gray-950/50 border border-white/5 rounded-2xl p-5 text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                <input type="email" placeholder="john@continental.com" className="w-full bg-gray-950/50 border border-white/5 rounded-2xl p-5 text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Message</label>
              <textarea placeholder="How can we help you grow?" className="w-full h-48 bg-gray-950/50 border border-white/5 rounded-3xl p-6 text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none transition-all"></textarea>
            </div>
            <button className="w-full py-6 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl shadow-xl shadow-purple-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 text-xl">
              Send Message <ChevronRight className="w-6 h-6" />
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-8 border-t border-white/5 bg-gray-950/80">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                <Share2 className="text-white w-6 h-6" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-white">SproutPulse</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs font-light">
              Elevating social media management through the lens of artificial intelligence and high-performance design.
            </p>
            <div className="flex gap-6">
              <Twitter className="w-6 h-6 text-gray-600 hover:text-white transition-colors cursor-pointer" />
              <Github className="w-6 h-6 text-gray-600 hover:text-white transition-colors cursor-pointer" />
              <Linkedin className="w-6 h-6 text-gray-600 hover:text-white transition-colors cursor-pointer" />
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-8 uppercase text-xs tracking-[0.2em]">Product</h4>
            <ul className="space-y-4 text-gray-500 text-sm font-medium">
              <li className="hover:text-purple-400 transition-colors cursor-pointer">AI Generator</li>
              <li className="hover:text-purple-400 transition-colors cursor-pointer">Global Scheduler</li>
              <li className="hover:text-purple-400 transition-colors cursor-pointer">Advanced Insights</li>
              <li className="hover:text-purple-400 transition-colors cursor-pointer">API Access</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-8 uppercase text-xs tracking-[0.2em]">Company</h4>
            <ul className="space-y-4 text-gray-500 text-sm font-medium">
              <li className="hover:text-purple-400 transition-colors cursor-pointer">About Us</li>
              <li className="hover:text-purple-400 transition-colors cursor-pointer">Careers</li>
              <li className="hover:text-purple-400 transition-colors cursor-pointer">Brand Assets</li>
              <li className="hover:text-purple-400 transition-colors cursor-pointer">Privacy</li>
            </ul>
          </div>
          <div className="space-y-8">
            <h4 className="text-white font-bold uppercase text-xs tracking-[0.2em]">Intelligence Weekly</h4>
            <p className="text-gray-500 text-sm font-light">Join 50k+ marketers receiving our exclusive strategy reports.</p>
            <div className="flex gap-2">
               <input type="text" placeholder="Email" className="flex-1 bg-gray-950 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
               <button className="bg-purple-600 hover:bg-purple-500 px-4 rounded-xl transition-all active:scale-95">
                  <Mail className="w-5 h-5 text-white" />
               </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-32 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-gray-600 text-[10px] uppercase font-black tracking-[0.3em]">
           <p>© 2024 SproutPulse Inc. Designed for creators.</p>
           <div className="flex gap-12">
              <span className="hover:text-white transition-colors cursor-pointer">Security</span>
              <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
              <span className="hover:text-white transition-colors cursor-pointer">SLA</span>
           </div>
        </div>
      </footer>

    </div>
  )
}
