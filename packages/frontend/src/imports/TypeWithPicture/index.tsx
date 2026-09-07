type NavigationMenuContentItemProps = {
  className?: string;
  state?: "Default";
};

function NavigationMenuContentItem({ className, state = "Default" }: NavigationMenuContentItemProps) {
  return (
    <div className={className || "bg-white relative rounded-[6px]"}>
      <div className="content-stretch flex flex-col items-start p-[12px] relative size-full">
        <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic relative shrink-0 text-[14px]">
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] relative shrink-0 text-black whitespace-nowrap">Introduction</p>
          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[#64748b] w-[227px]">Re-usable components built using Radix UI and Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
}

function Poster({ className }: { className?: string }) {
  return (
    <div className={className || "h-[270px] relative w-[188px]"} data-name="poster">
      <div className="absolute bg-gradient-to-b from-[#db4e66] inset-0 rounded-[5px] to-[#4e3aba] via-[#a24688] via-[39.568%]" />
      <div className="absolute contents inset-[37.04%_12.77%_8.89%_12.77%]">
        <div className="absolute content-stretch flex flex-col gap-[20px] inset-[37.04%_12.77%_8.89%_12.77%] items-start">
          <div className="relative shrink-0 size-[22px]">
            <svg className="absolute block inset-0 size-full" fill="none" height="22" preserveAspectRatio="none" viewBox="0 0 22 22" width="22">
              <circle cx="11" cy="11" fill="white" id="Ellipse 3" r="11" />
            </svg>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start not-italic relative shrink-0">
            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[24px] relative shrink-0 text-[18px] text-white whitespace-nowrap">shadcn/ui</p>
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[18px] relative shrink-0 text-[#e2e8f0] text-[14px] tracking-[-0.084px] w-[140px]">Beautifully designed components built with Radix UI and Tailwind CSS.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TypeWithPicture({ className }: { className?: string }) {
  return (
    <div className={className || "bg-white drop-shadow-[0px_4px_3px_rgba(0,0,0,0.09)] relative rounded-[6px]"} data-name="type=with picture">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="content-stretch flex flex-col items-start p-[24px] relative size-full">
        <div className="content-stretch flex gap-[12px] items-start relative shrink-0">
          <Poster className="h-[270px] relative shrink-0 w-[188px]" />
          <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0">
            <NavigationMenuContentItem className="bg-white relative rounded-[6px] shrink-0" />
            <div className="bg-white relative rounded-[6px] shrink-0" data-name="navigation menu content item">
              <div className="content-stretch flex flex-col items-start p-[12px] relative size-full">
                <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic relative shrink-0 text-[14px]">
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] relative shrink-0 text-black whitespace-nowrap">Installation</p>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[#64748b] w-[227px]">How to install dependencies and structure your app.</p>
                </div>
              </div>
            </div>
            <div className="bg-white relative rounded-[6px] shrink-0" data-name="navigation menu content item">
              <div className="content-stretch flex flex-col items-start p-[12px] relative size-full">
                <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic relative shrink-0 text-[14px]">
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] relative shrink-0 text-black whitespace-nowrap">Typography</p>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[#64748b] w-[227px]">Styles for headings, paragraphs, lists...etc</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}