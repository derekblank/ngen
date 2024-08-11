import "./css/Orbit.css";

function Orbit() {
  return (
    <div class="bigbang">
        <div class="gravity-spot">
            <div class="orbit">
                <div class="satellite at-center ">
                    <div class="capsule">volume</div>
                </div>
            </div>
            <div class="orbit-4">
                <div class="satellite">
                    <div class="gravity-spot">
                        <div class="orbit-1 shrink-30 from-90">
                            <div class="side"></div>
                            <div class="side"></div>
                            <div class="side"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="orbit-5"></div>
            <div class="orbit-6 shrink-80 from-215 range-290 fit-range">
                <div class="vector shrink-40 outer-orbit"></div>
                <div class="vector shrink-40 outer-orbit"></div>
                <div class="vector shrink-40 outer-orbit"></div>
                <div class="vector shrink-40 outer-orbit"></div>
                <div class="vector shrink-40 outer-orbit"></div>
                <div class="vector shrink-40 outer-orbit"></div>
                <div class="vector shrink-40 outer-orbit"></div>
                <div class="vector shrink-40 outer-orbit"></div>
                <div class="vector shrink-40 outer-orbit"></div>
                <div class="vector shrink-40 outer-orbit"></div>
                <div class="vector shrink-40 outer-orbit"></div>
            </div>
            <div class="orbit-6 orbit-6 from-215 range-290">
                <o-progress value="50" shape="circle" class="shrink-60 outer-orbit"></o-progress>
            </div>
        </div>
    </div>
  );
}

export default Orbit;
