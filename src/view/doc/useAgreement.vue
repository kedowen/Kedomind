<template>
  <div class="doc-container">
    <!-- 顶部导航条 -->
    <div class="top-nav">
      <div class="nav-content">
        <img src="@/assets/logo/logo-kedo.png" alt="KEDO" class="nav-logo" />
        <a-button 
          type="primary" 
          class="back-btn"
          @click="goBackToLogin"
        >
          {{ t('doc.backToLogin') }}
        </a-button>
      </div>
    </div>

    <div class="doc-content">
      <h1 class="title">{{ t('login.useAgreement') }}</h1>
      
      <div class="content-txt">
        蝌蚪文数字产品包括：蝌蚪文数字软件、蝌蚪文数字网站（www.onionbit.cn,www.dev.onionbit.cn）、蝌蚪文数字应用（洋葱BI,OnionBI,橙子物联）以及其它和蝌蚪文数字应用相关的服务。蝌蚪文数字是由苏州蝌蚪文数字科技有限公司 （以下简称"蝌蚪文数字科技"或"我们"）开发运营。本使用协议是你与蝌蚪文数字科技之间的协议，蝌蚪文数字科技如在必要的时候进行修订，无需另行通知。修订后的条款一旦在网页上公布即有效代替原来的使用协议。如果你使用蝌蚪文数字，你必须同意此使用协议。
      </div>

      <h2 class="sub-title">1.蝌蚪文数字的使用</h2>
      <div class="content-txt">
        <div>你在使用蝌蚪文数字之前需要注册蝌蚪文数字的账户，同时你需要仔细阅读本协议，并在充分阅读和理解了相关协议的约定后提交必要的个人信息完成注册。</div>
        <div>你可以免费使用蝌蚪文数字的非付费功能。</div>
        <div>如果你有意愿使用蝌蚪文数字的某些付费服务，这将表示你将同意支付其中的所有费用。 在你提交使用付费产品的申请后，我们将提供经我们认可的第三方在线服务机构的支付方式， 并要求你支付相关费用。成功支付后，表明你已经获得使用付费服务的权利并且已经达成此项交易，除非因为我们的原因导致服务无法正常提供，否则我们将不会退还你已经支付的服务 费。如果你代表某机构或某企业而非你个人使用蝌蚪文数字产品，则你将被认为获得充分授权代表该机构或该企业同意本协议条款以及本协议条款不时的修改和补充。</div>
        <div>以下行为是禁止的：</div>
        <div>(a) 滥用蝌蚪文数字的服务，多人使用同一个账号；</div>
        <div>(b) 未经授权，转售蝌蚪文数字的软件、功能和服务，包括不限于：完整的软件、全部或部分的专业付费功能和服务； </div>
        <div>(c) 采取恶意手段使用蝌蚪文数字, 造成服务器异常； </div>
        <div>(d) 使用蝌蚪文数字从事非法活动或为非法活动提供帮助。 如果你采取了上述行为，我们有权单方面终止/暂停你使用蝌蚪文数字并且不会退还你的付费，同时，我们将视该行为引起后果 的严重性，追究责任并保留通过法律途径追偿合理损失的权利。</div>
      </div>

      <h2 class="sub-title">2. 知识产权</h2>
      <div class="content-txt">
        蝌蚪文数字网站所包含的内容，如文字、图形、图像、商标、标识、音频、视频、软件、代码和其他材料，均受版权、商标和其他法律保护。未经我们事先书面同意，您不得复制、修改、分发或以其他方式使用这些内容。
      </div>

      <h2 class="sub-title">3. 用户数据私密性</h2>
      <div class="content-txt">
        <div>对于免费或者付费使用蝌蚪文数字软件的用户：</div>
        <div>(a) 对于你创建的本地项目文件，如果不使用云同步上传，你所创建的项目文件保存在你的电脑中，该项目文件的内容私密性由你个人负责，蝌蚪文数字不涉及也不承担该项目文件的数 据私密性责任。</div>
        <div>(b) 如使用同步功能上传到云，对于上传到云的项目文件，蝌蚪文数字承诺确保该项目文件的私密性，不会以任何方式传播用户数据。 对于付费使用蝌蚪文数字Web应用的用户，你的项目 是私密的，也即：除非用户本人自行传播数据（通过分享、审阅等方式），蝌蚪文数字承诺确保用户数据的私密性，不会以任何方式传播用户数据。 以上条款的不可抗力及免责，见条款5。</div>
      </div>

      <h2 class="sub-title">4. 关于用户个人信息</h2>
      <div class="content-txt">
        <div>我们尊重访问蝌蚪文数字网站的任何个人的隐私信息。</div>
        <div>当你访问网站的时候可能被要求提供你个人的基本资料（如姓名、电子邮件、电话号码等），你可以自行选择是否提供。</div>
        <div>对于你提供的个人信息，我们将根据国家相关法律进行保密并严格保管，不会将这些信息以任何方式提供或展示给任何第三方，但下述情况除外（即：得以免责）：</div>
        <div>(a) 当司法机关或行政机关依照法定程序和法定职权要求我们披露个人资料时，我们将依法提供相关资料； </div>
        <div>(b) 对于任何由黑客攻击、计算机病毒侵入或发作、或政府管制而造成的暂时性关闭等影响网站正常运营的不可抗力事件所造成的个人资料的泄露、丢失、被盗用或被篡改等； </div>
        <div>(c) 对于用户将个人密码告知他人或与他人共享注册账号所导致的任何个人资料泄露，丢失、被盗用或被篡改等； </div>
        <div>(d) 对于与蝌蚪文数字网站链接的任何其它网站的个人资料泄露，丢失、被盗用或被篡改等事件。</div>
      </div>

      <h2 class="sub-title">5. 不可抗力及免责</h2>
      <div class="content-txt">
        <div>你理解并同意：在使用本服务的过程中，可能会遇到不可抗力等风险因素，使本服务发生中断。不可抗力是指不能预见、不能克服并不能避免且对一方或双方造成重大影响的客观事 件，包括但不限于自然灾害如洪水、地震、瘟疫流行和风暴等以及社会事件如战争、动乱、政府行为等。 出现上述情况时，我们将努力在第一时间与相关单位配合，及时进行修复，但是由 此给你造成的损失，我们在法律允许的范围内免责。 </div>
        <div>在法律允许的范围内，我们对以下情形导致的服务中断或受阻不承担责任： </div>
        <div>(a) 受到计算机病毒、木马或其它恶意程序、黑客攻击的破坏； </div>
        <div>(b) 用户或我们的电脑软件、系统、硬件和通信线路出现故障； </div>
        <div>(c) 用户操作不当； </div>
        <div>(d) 用户通过非我们授权的方式使用本服务； </div>
        <div>(e) 其它我们无法控制或合理预见的情形。 你理解并同意：本服务并非为某些特定目的而设计，包括但不限于核设施、军事用途、 医疗设施、交通通讯等重要领域。 如果因为软件或 服务的原因导致上述操作失败而带来的人员伤亡、财产损失和环境破坏等，我们不承担法律责任。 </div>
      </div>

      <h2 class="sub-title">6. 生效与终止</h2>
      <div class="content-txt">
        <div>使用我们的服务即视为你已阅读本协议并接受本协议的约束。 </div>
        <div>我们有权在必要时修改本协议条款，你可以在相关服务页面查阅最新版本的协议条款。 本协议条款变更后，如果你继续使用我们提供的软件或服务，即视为你已接受修改后的协议。 如果你不接受修改后的协议，应当停止使用我们提供的软件或服务。 我们可能会对服务内容进行变更，也可能会中断、中止或终止服务。 如发生下列任何一种情形，我们有权不经过通知 而中断或终止向你提供的服务： </div>
        <div>(a) 根据法律规定你应提交真实信息，而你提供的个人资料不真实、或与注册时信息不一致又未能提供合理证明； </div>
        <div>(b) 你违反相关法律法规或本协议的约定； </div>
        <div>(c) 按照法律规定或主管部门的要求； </div>
        <div>(d) 出于安全的原因或其它必要的情形。 若你使用了我们提供的付费服务，但你未按时足额付费，我们有权中断或终止相关的服务。 </div>
      </div>

      <h2 class="sub-title">7. 准据法和管辖权</h2>
      <div class="content-txt">
        本协议的解释和适用均适用国家法律，由于使用蝌蚪文数字而产生的一切纠纷，均由蝌蚪文数字科技所在地人民法院管辖。如果本使用条款中的部分条款被有关机关认定为无效，则此无效 部分并不影响本使用条款其它部分的效力，其它部分仍然有效。
      </div>

      <h2 class="sub-title">8. 其它</h2>
      <div class="content-txt">
        如果你对本协议或本服务有意见或建议，可与我们客户服务部门联系，以官网公布联系方式为准。
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

// 返回登录页面
const goBackToLogin = () => {
  router.push('/login')
}
</script>

<style lang="scss" scoped>
.doc-container {
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(236, 228, 255, 0.50), #ffffff 21%, #ffffff 49%, rgba(255, 255, 255, 0.72) 78%, rgba(222, 238, 255, 0.50));
  min-height: 100vh;
  overflow-y: auto;
}

.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  z-index: 1000;
  
  .nav-content {
    max-width: 1200px;
    margin: 0 auto;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    
    .nav-logo {
      height: 40px;
      width: auto;
    }
    
    .back-btn {
      height: 36px;
      border-radius: 6px;
      font-size: 14px;
    }
  }
}

.doc-content {
  padding: 0 14%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 100px;
  word-break: break-all;
  letter-spacing: 0.96px;
  padding-bottom: 25px;
  max-height: calc(100vh - 100px); /* 顶部导航高度+间距 */
  overflow-y: auto;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #000000;
  margin-bottom: 60px;
  text-align: center;
}

.sub-title {
  margin-top: 65px;
  font-size: 16px;
  color: #000000;
  line-height: 32px;
  font-weight: bold;
  align-self: flex-start;
  margin-bottom: 27px;
}

.content-txt {
  font-size: 16px;
  color: #333333;
  line-height: 32px;
  text-indent: 2em;
  align-self: flex-start;
  
  div {
    margin-bottom: 8px;
  }
}
</style> 