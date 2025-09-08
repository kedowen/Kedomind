<!--  -->
<template>
  <div class="chart">
    <div class="chart-actions">
      <div class="chart-actions-row">
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">图表类型：</span>
          <a-select
              v-model:value="selectSeries"
              :options="options"
              style="width: 120px"
              @change="handleChange"
          ></a-select>
        </div>
      </div>
      <div v-if="selectSeries === CHART_TYPE_ENUM.BAR" class="chart-actions-row">
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">X轴：</span>
          <a-select
              v-model:value="chartSetOptions.bar.xAxis"
              :options="chartSetOptions.bar.options"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">Y轴：</span>
          <a-select
              v-model:value="chartSetOptions.bar.yAxis"
              :max-tag-count="3"
              :options="chartSetOptions.bar.options"
              mode="multiple"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <a-tooltip>
            <template #title>数据差值过大时，可开启此选项</template>
            <span class="chart-actions-row-item-label">数据美化：</span>
          </a-tooltip>
          <a-switch
              v-model:checked="chartSetOptions.bar.isLog"
              style="margin-right: 12px"
              @change="handleChange"
          />
          <a-input-number
              v-if="chartSetOptions.bar.isLog"
              v-model:value="chartSetOptions.bar.logBase"
              @blur="chartSetHandler.bar.logBaseBlur"
          />
        </div>
      </div>
      <div v-if="selectSeries === CHART_TYPE_ENUM.LINE" class="chart-actions-row">
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">X轴：</span>
          <a-select
              v-model:value="chartSetOptions.line.xAxis"
              :options="chartSetOptions.line.options"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">Y轴：</span>
          <a-select
              v-model:value="chartSetOptions.line.yAxis"
              :max-tag-count="3"
              :options="chartSetOptions.line.options"
              mode="multiple"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <a-tooltip>
            <template #title>数据差值过大时，可开启此选项</template>
            <span class="chart-actions-row-item-label">数据美化：</span>
          </a-tooltip>
          <a-switch
              v-model:checked="chartSetOptions.line.isLog"
              style="margin-right: 12px"
              @change="handleChange"
          />
          <a-input-number
              v-if="chartSetOptions.line.isLog"
              v-model:value="chartSetOptions.line.logBase"
              @blur="chartSetHandler.line.logBaseBlur"
          />
        </div>
      </div>
      <div v-if="selectSeries === CHART_TYPE_ENUM.PIE" class="chart-actions-row">
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">名称：</span>
          <a-select
              v-model:value="chartSetOptions.pie.xAxis"
              :options="chartSetOptions.pie.options"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">数据：</span>
          <a-select
              v-model:value="chartSetOptions.pie.yAxis"
              :options="chartSetOptions.pie.options"
              @change="handleChange"
          ></a-select>
        </div>
      </div>
      <div v-if="selectSeries === CHART_TYPE_ENUM.AREA" class="chart-actions-row">
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">X轴：</span>
          <a-select
              v-model:value="chartSetOptions.area.xAxis"
              :options="chartSetOptions.area.options"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">Y轴：</span>
          <a-select
              v-model:value="chartSetOptions.area.yAxis"
              :max-tag-count="3"
              :options="chartSetOptions.area.options"
              mode="multiple"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <a-tooltip>
            <template #title>数据差值过大时，可开启此选项</template>
            <span class="chart-actions-row-item-label">数据美化：</span>
          </a-tooltip>
          <a-switch
              v-model:checked="chartSetOptions.area.isLog"
              style="margin-right: 12px"
              @change="handleChange"
          />
          <a-input-number
              v-if="chartSetOptions.area.isLog"
              v-model:value="chartSetOptions.area.logBase"
              @blur="chartSetHandler.area.logBaseBlur"
          />
        </div>
      </div>
      <div v-if="selectSeries === CHART_TYPE_ENUM.HORIZONTAL_BAR" class="chart-actions-row">
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">Y轴：</span>
          <a-select
              v-model:value="chartSetOptions.horizontal_bar.yAxis"
              :options="chartSetOptions.horizontal_bar.options"

              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">

          <span class="chart-actions-row-item-label">X轴：</span>
          <a-select
              v-model:value="chartSetOptions.horizontal_bar.xAxis"
              :max-tag-count="3"
              :options="chartSetOptions.horizontal_bar.options"
              mode="multiple"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <a-tooltip>
            <template #title>数据差值过大时，可开启此选项</template>
            <span class="chart-actions-row-item-label">数据美化：</span>
          </a-tooltip>
          <a-switch
              v-model:checked="chartSetOptions.horizontal_bar.isLog"
              style="margin-right: 12px"
              @change="handleChange"
          />
          <a-input-number
              v-if="chartSetOptions.horizontal_bar.isLog"
              v-model:value="chartSetOptions.horizontal_bar.logBase"
              @blur="chartSetHandler.horizontal_bar.logBaseBlur"
          />
        </div>
      </div>
      <div v-if="selectSeries === CHART_TYPE_ENUM.THREE_D_BAR" class="chart-actions-row">
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">X轴：</span>
          <a-select
              v-model:value="chartSetOptions.three_d_bar.xAxis"
              :options="chartSetOptions.three_d_bar.options"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">Y轴：</span>
          <a-select
              v-model:value="chartSetOptions.three_d_bar.yAxis"
              :options="chartSetOptions.three_d_bar.options"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">Z轴：</span>
          <a-select
              v-model:value="chartSetOptions.three_d_bar.zAxis"
              :max-tag-count="3"
              :options="chartSetOptions.three_d_bar.options"
              mode="multiple"
              @change="handleChange"
          ></a-select>
        </div>
        <!--        <div class="chart-actions-row-item">-->
        <!--          <a-tooltip>-->
        <!--            <template #title>数据差值过大时，可开启此选项</template>-->
        <!--            <span class="chart-actions-row-item-label">数据美化：</span>-->
        <!--          </a-tooltip>-->
        <!--          <a-switch-->
        <!--              v-model:checked="chartSetOptions.three_d_bar.isLog"-->
        <!--              style="margin-right: 12px"-->
        <!--              @change="handleChange"-->
        <!--          />-->
        <!--          <a-input-number-->
        <!--              v-if="chartSetOptions.three_d_bar.isLog"-->
        <!--              v-model:value="chartSetOptions.three_d_bar.logBase"-->
        <!--              @blur="chartSetHandler.three_d_bar.logBaseBlur"-->
        <!--          />-->
        <!--        </div>-->
      </div>
      <div v-if="selectSeries === CHART_TYPE_ENUM.THREE_D_LINE" class="chart-actions-row">
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">X轴：</span>
          <a-select
              v-model:value="chartSetOptions.three_d_line.xAxis"
              :options="chartSetOptions.three_d_line.options"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">Y轴：</span>
          <a-select
              v-model:value="chartSetOptions.three_d_line.yAxis"
              :options="chartSetOptions.three_d_line.options"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">Z轴：</span>
          <a-select
              v-model:value="chartSetOptions.three_d_line.zAxis"
              :max-tag-count="3"
              :options="chartSetOptions.three_d_line.options"
              mode="multiple"
              @change="handleChange"
          ></a-select>
        </div>
        <!--        <div class="chart-actions-row-item">-->
        <!--          <a-tooltip>-->
        <!--            <template #title>数据差值过大时，可开启此选项</template>-->
        <!--            <span class="chart-actions-row-item-label">数据美化：</span>-->
        <!--          </a-tooltip>-->
        <!--          <a-switch-->
        <!--              v-model:checked="chartSetOptions.three_d_bar.isLog"-->
        <!--              style="margin-right: 12px"-->
        <!--              @change="handleChange"-->
        <!--          />-->
        <!--          <a-input-number-->
        <!--              v-if="chartSetOptions.three_d_bar.isLog"-->
        <!--              v-model:value="chartSetOptions.three_d_bar.logBase"-->
        <!--              @blur="chartSetHandler.three_d_bar.logBaseBlur"-->
        <!--          />-->
        <!--        </div>-->
      </div>
      <div v-if="selectSeries === CHART_TYPE_ENUM.THREE_D_SCATTER" class="chart-actions-row">
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">X轴：</span>
          <a-select
              v-model:value="chartSetOptions.three_d_scatter.xAxis"
              :options="chartSetOptions.three_d_scatter.options"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">Y轴：</span>
          <a-select
              v-model:value="chartSetOptions.three_d_scatter.yAxis"
              :options="chartSetOptions.three_d_scatter.options"
              @change="handleChange"
          ></a-select>
        </div>
        <div class="chart-actions-row-item">
          <span class="chart-actions-row-item-label">Z轴：</span>
          <a-select
              v-model:value="chartSetOptions.three_d_scatter.zAxis"
              :max-tag-count="3"
              :options="chartSetOptions.three_d_scatter.options"
              mode="multiple"
              @change="handleChange"
          ></a-select>
        </div>
        <!--        <div class="chart-actions-row-item">-->
        <!--          <a-tooltip>-->
        <!--            <template #title>数据差值过大时，可开启此选项</template>-->
        <!--            <span class="chart-actions-row-item-label">数据美化：</span>-->
        <!--          </a-tooltip>-->
        <!--          <a-switch-->
        <!--              v-model:checked="chartSetOptions.three_d_bar.isLog"-->
        <!--              style="margin-right: 12px"-->
        <!--              @change="handleChange"-->
        <!--          />-->
        <!--          <a-input-number-->
        <!--              v-if="chartSetOptions.three_d_bar.isLog"-->
        <!--              v-model:value="chartSetOptions.three_d_bar.logBase"-->
        <!--              @blur="chartSetHandler.three_d_bar.logBaseBlur"-->
        <!--          />-->
        <!--        </div>-->
      </div>
    </div>
    <div
        ref="myChart"
        :style="{ width: '100%', height: '400px' }"
    ></div>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  reactive,
  toRefs,
  defineProps,
  watchEffect,
  computed,
  onMounted,
  watch,
  nextTick,
  h,
} from "vue";
import * as echarts from "echarts";
import "echarts-gl"
import {message} from "ant-design-vue";

const props = defineProps({
  source: {
    type: Array,
    default: () => [],
  },
});
const emit = defineEmits();

// 所有图表类型
enum CHART_TYPE_ENUM {
  BAR = 'bar',// 柱状图
  LINE = 'line', // 折线
  PIE = 'pie', // 饼图
  AREA = 'area',// 区域图
  HORIZONTAL_BAR = 'horizontal_bar', // 横向柱状图
  THREE_D_BAR = 'three_d_bar',// 3D柱状图
  THREE_D_LINE = 'three_d_line',// 3D折线图
  THREE_D_SCATTER = 'three_d_scatter',// 3D散点图

}

const selectSeries = ref(CHART_TYPE_ENUM.BAR);
// 图表类型,用于select
const options = [
  {
    label: "柱状图",
    value: "bar",
  },
  {
    label: "折线图",
    value: "line",
  },
  {
    label: "饼图",
    value: "pie",
  },
  {
    label: "区域面积图",
    value: "area",
  },
  {
    label: "横向柱状图",
    value: "horizontal_bar",
  },
  {
    label: "3D柱状图",
    value: "three_d_bar",
  },
  {
    label: '3D折线图',
    value: "three_d_line",
  },
  {
    label: "3D散点图",
    value: "three_d_scatter",
  },
];


// 图表option
const chartsOption = {
  bar: {
    legend: {
      show: true,
      top: "1%", // 组件离容器上侧的距离
      type: "scroll",
      orient: "horizontal", // vertical
    },
    grid: {
      top: "23%",
      left: "3%",
      right: "3%",
      bottom: "3%",
      containLabel: true,
    },
    toolbox: {
      show: true,
      top: "10%", // 组件离容器上侧的距离
      feature: {
        saveAsImage: {
          show: true,
          title: "保存为图片",
        },
        // dataView: {
        //   show: true,
        //   readOnly: false,
        //   title: "数据视图",
        // },
        dataZoom: {
          show: true,
          title: {
            zoom: "区域缩放",
            back: "还原",
          },
        },
        // restore: {
        //   show: true,
        //   title: "还原",
        // },
      },
    },
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      type: "category",
      axisLabel: {
        interval: 0,
        rotate: 40,
      },
    },
    yAxis: {
      type: "value",
    },
  },
  line: {
    legend: {
      show: true,
      top: "1%", // 组件离容器上侧的距离
      type: "scroll",
      orient: "horizontal", // vertical
    },
    grid: {
      top: "23%",
      left: "3%",
      right: "3%",
      bottom: "3%",
      containLabel: true,
    },
    toolbox: {
      show: true,
      top: "10%", // 组件离容器上侧的距离
      feature: {
        saveAsImage: {
          show: true,
          title: "保存为图片",
        },
        // dataView: {
        //   show: true,
        //   readOnly: true,
        //   title: "数据视图",
        // },
        dataZoom: {
          show: true,
          title: {
            zoom: "区域缩放",
            back: "还原",
          },
        },
        // restore: {
        //   show: true,
        //   title: "还原",
        // },
      },
    },
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      type: "category",
      axisLabel: {
        interval: 0,
        rotate: 40,
      },
    },
    yAxis: {
      type: "value",
    },
  },
  pie: {
    legend: {
      show: true,
      top: "1%", // 组件离容器上侧的距离
      type: "scroll",
      orient: "horizontal", // vertical
    },
    grid: {
      top: "30%",
      left: "3%",
      right: "3%",
      bottom: "3%",
      containLabel: true,
    },
    toolbox: {
      show: true,
      top: "5%",
      feature: {
        saveAsImage: {
          show: true,
          title: "保存为图片",
        },
      },
    },
    tooltip: {
      trigger: "item",
      // formatter: "{b} :{e} {c} 个,占比： ({d}%)",
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: "rgba(0, 0, 0, 0.5)",
      },
    },
  },
  area: {
    legend: {
      show: true,
      top: "1%", // 组件离容器上侧的距离
      type: "scroll",
      orient: "horizontal", // vertical
    },
    grid: {
      top: "23%",
      left: "3%",
      right: "3%",
      bottom: "3%",
      containLabel: true,
    },
    toolbox: {
      show: true,
      top: "10%", // 组件离容器上侧的距离
      feature: {
        saveAsImage: {
          show: true,
          title: "保存为图片",
        },
        // dataView: {
        //   show: true,
        //   readOnly: true,
        //   title: "数据视图",
        // },
        dataZoom: {
          show: true,
          title: {
            zoom: "区域缩放",
            back: "还原",
          },
        },
        // restore: {
        //   show: true,
        //   title: "还原",
        // },
      },
    },
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      type: "category",
      axisLabel: {
        interval: 0,
        rotate: 40,
      },
    },
    yAxis: {
      type: "value",
    },
  },
  horizontal_bar: {
    legend: {
      show: true,
      top: "1%", // 组件离容器上侧的距离
      type: "scroll",
      orient: "horizontal", // vertical
    },
    grid: {
      top: "23%",
      left: "3%",
      right: "3%",
      bottom: "3%",
      containLabel: true,
    },
    toolbox: {
      show: true,
      top: "10%", // 组件离容器上侧的距离
      feature: {
        saveAsImage: {
          show: true,
          title: "保存为图片",
        },
        // dataView: {
        //   show: true,
        //   readOnly: false,
        //   title: "数据视图",
        // },
        dataZoom: {
          show: true,
          title: {
            zoom: "区域缩放",
            back: "还原",
          },
        },
        // restore: {
        //   show: true,
        //   title: "还原",
        // },
      },
    },
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      type: "value",
    },
    yAxis: {
      type: "category",
      // axisLabel: {
      //   interval: 0,
      //   rotate: 40,
      // },
    },
  },
  three_d_bar: {
    legend: {
      show: true,
      top: "1%", // 组件离容器上侧的距离
      type: "scroll",
      orient: "horizontal", // vertical
    },
    grid3D: {
      show: true,//是否显示三维迪卡尔坐标
      boxWidth: 100,//三维场景高度
      boxDepth: 80,//三维笛卡尔坐标系组件在三维场景中的深度。
    },
    tooltip: {},
    toolbox: {
      show: true,
      top: "10%",
      feature: {
        saveAsImage: {
          show: true,
          title: "保存为图片",
        },
      },
    },
    xAxis3D: {
      type: 'category'
    },
    yAxis3D: {
      type: 'category'
    },
    zAxis3D: {
      type: 'value',
      scale: {
        type: 'interval'
      }
    },
  },
  three_d_line: {
    legend: {
      show: true,
      top: "1%", // 组件离容器上侧的距离
      type: "scroll",
      orient: "horizontal", // vertical
    },
    grid3D: {
      show: true,//是否显示三维迪卡尔坐标
      boxWidth: 100,//三维场景高度
      boxDepth: 80,//三维笛卡尔坐标系组件在三维场景中的深度。
    },
    tooltip: {},
    toolbox: {
      show: true,
      top: "10%",
      feature: {
        saveAsImage: {
          show: true,
          title: "保存为图片",
        },
      },
    },
    xAxis3D: {
      type: 'category'
    },
    yAxis3D: {
      type: 'category'
    },
    zAxis3D: {
      type: 'value',
      scale: {
        type: 'interval'
      }
    },
  },
  three_d_scatter: {
    legend: {
      show: true,
      top: "1%", // 组件离容器上侧的距离
      type: "scroll",
      orient: "horizontal", // vertical
    },
    grid3D: {
      show: true,//是否显示三维迪卡尔坐标
      boxWidth: 100,//三维场景高度
      boxDepth: 80,//三维笛卡尔坐标系组件在三维场景中的深度。
    },
    tooltip: {},
    toolbox: {
      show: true,
      top: "10%",
      feature: {
        saveAsImage: {
          show: true,
          title: "保存为图片",
        },
      },
    },
    xAxis3D: {
      type: 'category'
    },
    yAxis3D: {
      type: 'category'
    },
    zAxis3D: {
      type: 'value',
      scale: {
        type: 'interval'
      }
    },
  }
};

// 处理不同图表类型不同的配置条件
const chartSetOptions = reactive({
  pie: {
    options: [],
    xAxis: "", // 指定x轴
    yAxis: "", // 指定y轴
  },
  // 柱状图
  bar: {
    options: [],
    xAxis: "", // 指定x轴
    yAxis: [], // 指定y轴
    isLog: false,
    logBase: 10,
  },
  // 折线图
  line: {
    options: [],
    xAxis: "", // 指定x轴
    yAxis: [], // 指定y轴
    isLog: false,
    logBase: 10,
  },
  area: {
    options: [],
    xAxis: "", // 指定x轴
    yAxis: [], // 指定y轴
    isLog: false,
    logBase: 10,
  },
  horizontal_bar: {
    options: [],
    xAxis: [], // 指定x轴
    yAxis: "", // 指定y轴
    isLog: false,
    logBase: 10,
  },
  three_d_bar: {
    options: [],
    xAxis: "", // 指定x轴
    yAxis: "", // 指定y轴
    zAxis: [], // 指定y轴
  },
  three_d_line: {
    options: [],
    xAxis: "", // 指定x轴
    yAxis: "", // 指定y轴
    zAxis: [], // 指定y轴
  },
  three_d_scatter: {
    options: [],
    xAxis: "", // 指定x轴
    yAxis: "", // 指定y轴
    zAxis: [], // 指定y轴
  },
});
// 图表配置处理器
const chartSetHandler = {
  // 柱状图
  bar: {
    logBaseBlur() {
      const num = chartSetOptions.bar.logBase;
      if (num <= 0 || num === 1) {
        message.error("对数底数必须大于0且不等于1");
        chartSetOptions.bar.logBase = 10;
        return;
      }
      handleChange();
    },
  },
  // 折线图
  line: {
    logBaseBlur() {
      const num = chartSetOptions.line.logBase;
      if (num <= 0 || num === 1) {
        message.error("对数底数必须大于0且不等于1");
        chartSetOptions.line.logBase = 10;
        return;
      }
      handleChange();
    },
  },
  // 饼图
  pie: {},
  // 区域图
  area: {
    logBaseBlur() {
      const num = chartSetOptions.area.logBase;
      if (num <= 0 || num === 1) {
        message.error("对数底数必须大于0且不等于1");
        chartSetOptions.area.logBase = 10;
        return;
      }
      handleChange();
    },
  },
  // 横向柱状图
  horizontal_bar: {
    logBaseBlur() {
      const num = chartSetOptions.horizontal_bar.logBase;
      if (num <= 0 || num === 1) {
        message.error("对数底数必须大于0且不等于1");
        chartSetOptions.horizontal_bar.logBase = 10;
        return;
      }
      handleChange();
    }
  },
  // 3d 柱状图
  three_d_bar: {},
  // 3d 折线图
  three_d_line: {},
  // 3d 散点图
  three_d_scatter: {}
};

/**
 * 过滤数据
 * @param data
 */
function filterData(data: []) {


}


function handleChange() {
  chartInstance.dispose();
  chartInstance = echarts.init(myChart.value);
  const data = props.source;
  if (data.length === 0 || !Array.isArray(data)) return;
  switch (selectSeries.value) {
    case CHART_TYPE_ENUM.BAR: {
      // 可选项
      if (chartSetOptions.bar.options.length === 0) {
        chartSetOptions.bar.options = data[0].map((item) => {
          return {label: item, value: item};
        });
      }
      const options = chartSetOptions.bar.options.map((item) => item.value);
      // x轴
      chartSetOptions.bar.xAxis = chartSetOptions.bar.xAxis || options[0];
      // Y轴
      const yAxis = chartSetOptions.bar.yAxis;
      chartSetOptions.bar.yAxis =
          yAxis.length === 0
              ? options.filter((item) => item !== chartSetOptions.bar.xAxis)
              : yAxis;
      chartInstance.setOption(
          {
            ...chartsOption["bar"],
            yAxis: {
              type: chartSetOptions.bar.isLog ? "log" : "value",
              logBase: chartSetOptions.bar.logBase,
            },
            dataset: {source: data},
            series: chartSetOptions.bar.yAxis.map((item, index) => {
              return {
                type: "bar",

                encode: {
                  x: chartSetOptions.bar.xAxis,
                  y: item,
                  seriesName: item,
                },
              };
            }),
          },
          true
      );
    }
      break;
    case CHART_TYPE_ENUM.LINE: {
      // 可选项
      if (chartSetOptions.line.options.length === 0) {
        chartSetOptions.line.options = data[0].map((item) => {
          return {label: item, value: item};
        });
      }
      const options = chartSetOptions.line.options.map((item) => item.value);
      // x轴
      chartSetOptions.line.xAxis = chartSetOptions.line.xAxis || options[0];
      // Y轴
      const yAxis = chartSetOptions.line.yAxis;
      chartSetOptions.line.yAxis =
          yAxis.length === 0
              ? options.filter((item) => item !== chartSetOptions.line.xAxis)
              : yAxis;
      chartInstance.setOption(
          {
            ...chartsOption["line"],
            yAxis: {
              type: chartSetOptions.line.isLog ? "log" : "value",
              logBase: chartSetOptions.line.logBase,
            },
            dataset: {source: data},
            series: chartSetOptions.line.yAxis.map((item, index) => {
              return {
                type: "line",
                encode: {
                  x: chartSetOptions.line.xAxis,
                  y: item,
                  seriesName: item,
                },
              };
            }),
          },
          true
      );
    }
      break;
    case CHART_TYPE_ENUM.PIE: {
      // 可选项
      if (chartSetOptions.pie.options.length === 0) {
        chartSetOptions.pie.options = data[0].map((item) => {
          return {label: item, value: item};
        });
      }
      const options = chartSetOptions.pie.options.map((item) => item.value);
      chartSetOptions.pie.xAxis = chartSetOptions.pie.xAxis || options[0];
      chartSetOptions.pie.yAxis = chartSetOptions.pie.yAxis || options[1];
      chartInstance.setOption(
          {
            ...chartsOption["pie"],
            dataset: {source: data},
            series: {
              type: "pie",
              encode: {
                itemName: chartSetOptions.pie.xAxis,
                value: chartSetOptions.pie.yAxis,
                // tooltip: chartSetOptions.pie.valueKey,
              },
              label: {
                position: "outer",
                alignTo: "edge",
                margin: 0,
                bleedMargin: 6,
              },
            },
          },
          true
      );
    }
      break;
    case CHART_TYPE_ENUM.AREA: {
      // 可选项
      if (chartSetOptions.area.options.length === 0) {
        chartSetOptions.area.options = data[0].map((item) => {
          return {label: item, value: item};
        });
      }
      const options = chartSetOptions.area.options.map((item) => item.value);
      // x轴
      chartSetOptions.area.xAxis = chartSetOptions.area.xAxis || options[0];
      // Y轴
      const yAxis = chartSetOptions.area.yAxis;
      chartSetOptions.area.yAxis =
          yAxis.length === 0
              ? options.filter((item) => item !== chartSetOptions.area.xAxis)
              : yAxis;
      chartInstance.setOption(
          {
            ...chartsOption[CHART_TYPE_ENUM.AREA],
            yAxis: {
              type: chartSetOptions.area.isLog ? "log" : "value",
              logBase: chartSetOptions.area.logBase,
            },
            dataset: {source: data},
            series: chartSetOptions.area.yAxis.map((item, index) => {
              return {
                type: "line",
                smooth: true,
                areaStyle: {},
                encode: {
                  x: chartSetOptions.area.xAxis,
                  y: item,
                  seriesName: item,
                },
              };
            }),
          },
          true
      );
    }
      break;
    case CHART_TYPE_ENUM.HORIZONTAL_BAR: {
      // 可选项
      if (chartSetOptions.horizontal_bar.options.length === 0) {
        chartSetOptions.horizontal_bar.options = data[0].map((item) => {
          return {label: item, value: item};
        });
      }
      const options = chartSetOptions.horizontal_bar.options.map((item) => item.value);
      // y轴
      chartSetOptions.horizontal_bar.yAxis = chartSetOptions.horizontal_bar.yAxis || options[0];
      // x轴
      const xAxis = chartSetOptions.horizontal_bar.xAxis;
      chartSetOptions.horizontal_bar.xAxis =
          xAxis.length === 0
              ? options.filter((item) => item !== chartSetOptions.horizontal_bar.yAxis)
              : xAxis;
      chartInstance.setOption(
          {
            ...chartsOption[CHART_TYPE_ENUM.HORIZONTAL_BAR],
            xAxis: {
              type: chartSetOptions.horizontal_bar.isLog ? "log" : "value",
              logBase: chartSetOptions.horizontal_bar.logBase,
            },
            dataset: {source: data},
            series: chartSetOptions.horizontal_bar.xAxis.map((item, index) => {
              return {
                type: "bar",
                encode: {
                  y: chartSetOptions.horizontal_bar.yAxis,
                  x: item,
                  seriesName: item,
                },
              };
            }),
          },
          true
      );
    }
      break;
    case CHART_TYPE_ENUM.THREE_D_BAR: {
      // 可选项
      if (chartSetOptions.three_d_bar.options.length === 0) {
        chartSetOptions.three_d_bar.options = data[0].map((item) => {
          return {label: item, value: item};
        });
      }
      const options = chartSetOptions.three_d_bar.options.map((item) => item.value);
      // x轴
      chartSetOptions.three_d_bar.xAxis = chartSetOptions.three_d_bar.xAxis || options?.[0];
      // Y轴
      chartSetOptions.three_d_bar.yAxis = chartSetOptions.three_d_bar.yAxis || options?.[1];
      // z轴
      const zAxis = chartSetOptions.three_d_bar.zAxis;
      chartSetOptions.three_d_bar.zAxis =
          zAxis.length === 0
              ? options.filter((item) => item !== chartSetOptions.three_d_bar.xAxis && item !== chartSetOptions.three_d_bar.yAxis)
              : zAxis;
      chartInstance.setOption(
          {
            ...chartsOption[CHART_TYPE_ENUM.THREE_D_BAR],
            dataset: {source: data},
            series: chartSetOptions.three_d_bar.zAxis.map((item, index) => {
              return {
                type: "bar3D",
                encode: {
                  x: chartSetOptions.three_d_bar.xAxis,
                  y: chartSetOptions.three_d_bar.yAxis,
                  z: item,
                  seriesName: item,
                },
              };
            }),
          },
          true
      );
    }
      break;
    case CHART_TYPE_ENUM.THREE_D_LINE: {
      // 可选项
      if (chartSetOptions.three_d_line.options.length === 0) {
        chartSetOptions.three_d_line.options = data[0].map((item) => {
          return {label: item, value: item};
        });
      }
      const options = chartSetOptions.three_d_line.options.map((item) => item.value);
      // x轴
      chartSetOptions.three_d_line.xAxis = chartSetOptions.three_d_line.xAxis || options?.[0];
      // Y轴
      chartSetOptions.three_d_line.yAxis = chartSetOptions.three_d_line.yAxis || options?.[1];
      // z轴
      const zAxis = chartSetOptions.three_d_line.zAxis;
      chartSetOptions.three_d_line.zAxis =
          zAxis.length === 0
              ? options.filter((item) => item !== chartSetOptions.three_d_line.xAxis && item !== chartSetOptions.three_d_line.yAxis)
              : zAxis;
      chartInstance.setOption(
          {
            ...chartsOption[CHART_TYPE_ENUM.THREE_D_LINE],
            dataset: {source: data},
            series: chartSetOptions.three_d_line.zAxis.map((item, index) => {
              return {
                type: "line3D",
                encode: {
                  x: chartSetOptions.three_d_line.xAxis,
                  y: chartSetOptions.three_d_line.yAxis,
                  z: item,
                  seriesName: item,
                },
              };
            }),
          },
          true
      );
    }
      break;
    case CHART_TYPE_ENUM.THREE_D_SCATTER: {
      // 可选项
      if (chartSetOptions.three_d_scatter.options.length === 0) {
        chartSetOptions.three_d_scatter.options = data[0].map((item) => {
          return {label: item, value: item};
        });
      }
      const options = chartSetOptions.three_d_scatter.options.map((item) => item.value);
      // x轴
      chartSetOptions.three_d_scatter.xAxis = chartSetOptions.three_d_scatter.xAxis || options?.[0];
      // Y轴
      chartSetOptions.three_d_scatter.yAxis = chartSetOptions.three_d_scatter.yAxis || options?.[1];
      // z轴
      const zAxis = chartSetOptions.three_d_scatter.zAxis;
      chartSetOptions.three_d_scatter.zAxis =
          zAxis.length === 0
              ? options.filter((item) => item !== chartSetOptions.three_d_scatter.xAxis && item !== chartSetOptions.three_d_scatter.yAxis)
              : zAxis;
      chartInstance.setOption(
          {
            ...chartsOption[CHART_TYPE_ENUM.THREE_D_SCATTER],
            dataset: {source: data},
            series: chartSetOptions.three_d_scatter.zAxis.map((item, index) => {
              return {
                type: "scatter3D",
                encode: {
                  x: chartSetOptions.three_d_scatter.xAxis,
                  y: chartSetOptions.three_d_scatter.yAxis,
                  z: item,
                  seriesName: item,
                },
              };
            }),
          },
          true
      );
    }
      break;
  }
}

const myChart = ref();
let chartInstance;
onMounted(() => {
  chartInstance = echarts.init(myChart.value);
  handleChange();
});
</script>
<style lang="scss" scoped>
.chart {
  transition: all 0.3s linear;

  &-actions {
    &-row {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      gap: 12px;
      flex-wrap: wrap;

      &-item {
        display: flex;
        align-items: center;

        &-label {
          text-wrap: nowrap;
        }
      }
    }
  }
}
</style>
