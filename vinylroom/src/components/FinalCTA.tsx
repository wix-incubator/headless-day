"use client";

import { motion } from "framer-motion";
import VinylDisc from "./VinylDisc";
import MagneticButton from "./MagneticButton";

export default function FinalCTA() {
  return (
    <section id="final" className="relative z-10 overflow-hidden px-5 py-32 sm:px-8 lg:py-44">
      {/* giant ghost vinyl */}
      <motion.div
        aria-hidden
        initial={false}
        whileInView={{ opacity: 0.5, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[130vw] max-w-[52rem] -translate-x-1/2 -translate-y-1/2"
      >
        <VinylDisc accent="#b45f2a" spinning className="w-full opacity-40" />
      </motion.div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(8,7,6,0.9)_65%)]" />

      <div className="relative mx-auto max-w-2xl text-center">
        <motion.span
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="eyebrow"
        >
          Your records deserve a room
        </motion.span>
        <motion.h2
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 text-balance font-display text-[clamp(2.6rem,7vw,5rem)] leading-[0.95] text-cream"
        >
          Create a listening night. <span className="italic">Open a few seats.</span>
        </motion.h2>
        <motion.p
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.16 }}
          className="mx-auto mt-6 max-w-md text-lg text-parchment"
        >
          Let the right people discover the music with you.
        </motion.p>
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.24 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <MagneticButton href="#host">Start hosting →</MagneticButton>
          <MagneticButton href="#rooms" variant="ghost">Explore rooms</MagneticButton>
        </motion.div>
      </div>
    </section>
  );
}
