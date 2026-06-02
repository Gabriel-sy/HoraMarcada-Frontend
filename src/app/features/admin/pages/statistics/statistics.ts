import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, inject, signal, computed, NgZone } from '@angular/core';
import { CommonModule, CurrencyPipe, PercentPipe } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminStateService } from '../../services/admin-state.service';
import { StoreStatisticsResponse } from '../../models/statistics.model';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner';
import * as echarts from 'echarts';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  templateUrl: './statistics.html',
  styleUrl: './statistics.css',
  providers: [CurrencyPipe, PercentPipe]
})
export class StatisticsComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly adminApiService = inject(AdminApiService);
  private readonly stateService = inject(AdminStateService);
  private readonly zone = inject(NgZone);
  private readonly currencyPipe = inject(CurrencyPipe);

  @ViewChild('dailyChart') dailyChartRef?: ElementRef<HTMLDivElement>;
  @ViewChild('servicesChart') servicesChartRef?: ElementRef<HTMLDivElement>;
  @ViewChild('revenueChart') revenueChartRef?: ElementRef<HTMLDivElement>;
  @ViewChild('professionalsChart') professionalsChartRef?: ElementRef<HTMLDivElement>;

  readonly storeId = signal<string | null>(null);
  readonly loading = this.stateService.loadingStatistics;
  readonly error = signal<string | null>(null);
  readonly statistics = this.stateService.statistics;
  readonly selectedPreset = signal<number>(30);

  readonly averageTicket = computed(() => {
    const stats = this.statistics();
    if (!stats || stats.totalAppointments === 0) {
      return 0;
    }
    return stats.estimatedRevenue / stats.totalAppointments;
  });

  private chartInstances: echarts.ECharts[] = [];

  ngOnInit(): void {
    this.loadStoreData();
  }

  ngOnDestroy(): void {
    this.disposeCharts();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.chartInstances.forEach(chart => chart.resize());
  }

  private loadStoreData(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }
    this.stateService.loadStore(userId).subscribe({
      next: (store) => {
        this.storeId.set(store.id);
        this.loadStatistics();
      },
      error: () => {
        this.error.set('Erro ao carregar dados do estabelecimento.');
      }
    });
  }

  loadStatistics(forceRefresh = false): void {
    const sId = this.storeId();
    if (!sId) {
      return;
    }

    this.error.set(null);
    this.stateService.loadStatistics(sId, this.selectedPreset(), forceRefresh).subscribe({
      next: () => {
        setTimeout(() => this.renderCharts(), 50);
      },
      error: () => {
        this.error.set('Erro ao carregar dados estatísticos do painel.');
      }
    });
  }

  setPreset(days: number): void {
    this.selectedPreset.set(days);
    this.loadStatistics();
  }

  private disposeCharts(): void {
    this.chartInstances.forEach(chart => {
      if (!chart.isDisposed()) {
        chart.dispose();
      }
    });
    this.chartInstances = [];
  }

  private renderCharts(): void {
    this.disposeCharts();
    const stats = this.statistics();
    if (!stats) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      const dailyEl = this.dailyChartRef?.nativeElement;
      if (dailyEl) {
        const dailyChart = echarts.init(dailyEl);
        dailyChart.setOption(this.getDailyChartOption(stats));
        this.chartInstances.push(dailyChart);
      }

      const servicesEl = this.servicesChartRef?.nativeElement;
      if (servicesEl) {
        const servicesChart = echarts.init(servicesEl);
        servicesChart.setOption(this.getServicesChartOption(stats));
        this.chartInstances.push(servicesChart);
      }

      const revenueEl = this.revenueChartRef?.nativeElement;
      if (revenueEl) {
        const revenueChart = echarts.init(revenueEl);
        revenueChart.setOption(this.getRevenueChartOption(stats));
        this.chartInstances.push(revenueChart);

        const sortedServices = [...stats.mostPopularServices]
          .sort((a, b) => a.revenue - b.revenue);
        const names = sortedServices.map(s => s.serviceName);

        const showTooltip = (params: any) => {
          if (params.componentType === 'yAxis' && params.targetType === 'axisLabel') {
            const dataIndex = names.indexOf(params.value);
            if (dataIndex !== -1) {
              revenueChart.dispatchAction({
                type: 'showTip',
                seriesIndex: 0,
                dataIndex: dataIndex
              });
            }
          }
        };

        revenueChart.on('mouseover', showTooltip);
        revenueChart.on('click', showTooltip);
      }

      const professionalsEl = this.professionalsChartRef?.nativeElement;
      if (professionalsEl) {
        const professionalsChart = echarts.init(professionalsEl);
        professionalsChart.setOption(this.getProfessionalsChartOption(stats));
        this.chartInstances.push(professionalsChart);

        const sortedProfs = [...stats.professionalOccupation]
          .map(p => ({
            name: p.professionalName,
            hours: parseFloat((p.totalMinutes / 60).toFixed(1)),
            count: p.count
          }))
          .sort((a, b) => a.hours - b.hours);
        const names = sortedProfs.map(p => p.name);

        const showTooltip = (params: any) => {
          if (params.componentType === 'yAxis' && params.targetType === 'axisLabel') {
            const dataIndex = names.indexOf(params.value);
            if (dataIndex !== -1) {
              professionalsChart.dispatchAction({
                type: 'showTip',
                seriesIndex: 0,
                dataIndex: dataIndex
              });
            }
          }
        };

        professionalsChart.on('mouseover', showTooltip);
        professionalsChart.on('click', showTooltip);
      }
    });
  }

  private getDailyChartOption(stats: StoreStatisticsResponse): echarts.EChartsOption {
    const isMobile = window.innerWidth < 768;
    const dates = stats.dailyAppointments.map(d => {
      const parts = d.date.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const values = stats.dailyAppointments.map(d => d.count);

    return {
      grid: {
        top: 20,
        bottom: 30,
        left: isMobile ? 10 : 30,
        right: isMobile ? 10 : 15,
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        appendTo: 'body',
        confine: true,
        backgroundColor: '#000000',
        textStyle: {
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12
        },
        padding: [8, 12],
        borderWidth: 0,
        formatter: (params: any) => {
          const item = params[0];
          return `${item.name}: <b>${item.value} agendamentos</b>`;
        }
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: '#e5e5e5'
          }
        },
        axisLabel: {
          color: '#737373',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          interval: isMobile ? 2 : 0,
          hideOverlap: true
        }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: {
          lineStyle: {
            color: '#e5e5e5',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: '#737373',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11
        }
      },
      series: [
        {
          data: values,
          type: 'line',
          smooth: true,
          symbolSize: 6,
          lineStyle: {
            color: '#a3d271',
            width: 3
          },
          itemStyle: {
            color: '#a3d271',
            borderWidth: 2,
            borderColor: '#ffffff'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(163, 210, 113, 0.4)' },
              { offset: 1, color: 'rgba(163, 210, 113, 0.0)' }
            ])
          }
        }
      ]
    };
  }

  private getServicesChartOption(stats: StoreStatisticsResponse): echarts.EChartsOption {
    const isMobile = window.innerWidth < 768;
    const data = stats.mostPopularServices.map(s => ({
      name: s.serviceName,
      value: s.count
    }));

    return {
      tooltip: {
        trigger: 'item',
        appendTo: 'body',
        confine: true,
        backgroundColor: '#000000',
        textStyle: {
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12
        },
        padding: [8, 12],
        borderWidth: 0,
        formatter: (params: any) => {
          return `${params.name}: <b>${params.value} agendamentos</b> (${params.percent}%)`;
        }
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: {
          color: '#737373',
          fontFamily: 'Inter, sans-serif',
          fontSize: isMobile ? 10 : 11
        }
      },
      series: [
        {
          type: 'pie',
          radius: isMobile ? ['35%', '60%'] : ['45%', '70%'],
          center: isMobile ? ['50%', '38%'] : ['50%', '42%'],
          avoidLabelOverlap: false,
          padAngle: 2,
          itemStyle: {
            borderRadius: 6
          },
          label: {
            show: false
          },
          color: ['#a3d271', '#737373', '#b4df82', '#a3a3a3', '#f0f7e8', '#e5e5e5'],
          data: data
        }
      ]
    };
  }

  private getRevenueChartOption(stats: StoreStatisticsResponse): echarts.EChartsOption {
    const isMobile = window.innerWidth < 768;
    const sortedServices = [...stats.mostPopularServices]
      .sort((a, b) => a.revenue - b.revenue);

    const names = sortedServices.map(s => s.serviceName);
    const revenues = sortedServices.map(s => s.revenue);

    return {
      grid: {
        top: 20,
        bottom: 20,
        left: isMobile ? 5 : 20,
        right: isMobile ? 15 : 40,
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        appendTo: 'body',
        confine: true,
        backgroundColor: '#000000',
        textStyle: {
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12
        },
        padding: [8, 12],
        borderWidth: 0,
        formatter: (params: any) => {
          const item = params[0];
          const val = this.currencyPipe.transform(item.value, 'BRL', 'symbol', '1.2-2', 'pt-BR');
          return `${item.name}: <b>${val}</b>`;
        }
      },
      xAxis: {
        type: 'value',
        splitLine: {
          lineStyle: {
            color: '#e5e5e5',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: '#737373',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11
        }
      },
      yAxis: {
        type: 'category',
        data: names,
        triggerEvent: true,
        axisLine: {
          lineStyle: {
            color: '#e5e5e5'
          }
        },
        axisLabel: {
          color: '#737373',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          formatter: (value: string) => {
            const limit = isMobile ? 12 : 20;
            return value.length > limit ? value.substring(0, limit - 3) + '...' : value;
          }
        }
      },
      series: [
        {
          data: revenues,
          type: 'bar',
          barMaxWidth: 16,
          itemStyle: {
            color: '#b4df82',
            borderRadius: [0, 4, 4, 0]
          }
        }
      ]
    };
  }

  private getProfessionalsChartOption(stats: StoreStatisticsResponse): echarts.EChartsOption {
    const isMobile = window.innerWidth < 768;
    const sortedProfs = [...stats.professionalOccupation]
      .map(p => ({
        name: p.professionalName,
        hours: parseFloat((p.totalMinutes / 60).toFixed(1)),
        count: p.count
      }))
      .sort((a, b) => a.hours - b.hours);

    const names = sortedProfs.map(p => p.name);
    const hours = sortedProfs.map(p => p.hours);

    return {
      grid: {
        top: 20,
        bottom: 20,
        left: isMobile ? 5 : 20,
        right: isMobile ? 15 : 40,
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        appendTo: 'body',
        confine: true,
        backgroundColor: '#000000',
        textStyle: {
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12
        },
        padding: [8, 12],
        borderWidth: 0,
        formatter: (params: any) => {
          const item = params[0];
          const prof = sortedProfs[item.dataIndex];
          return `${item.name}: <b>${item.value} horas</b> (${prof.count} atendimentos)`;
        }
      },
      xAxis: {
        type: 'value',
        splitLine: {
          lineStyle: {
            color: '#e5e5e5',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: '#737373',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11
        }
      },
      yAxis: {
        type: 'category',
        data: names,
        triggerEvent: true,
        axisLine: {
          lineStyle: {
            color: '#e5e5e5'
          }
        },
        axisLabel: {
          color: '#737373',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          formatter: (value: string) => {
            const limit = isMobile ? 12 : 20;
            return value.length > limit ? value.substring(0, limit - 3) + '...' : value;
          }
        }
      },
      series: [
        {
          data: hours,
          type: 'bar',
          barMaxWidth: 16,
          itemStyle: {
            color: '#a3d271',
            borderRadius: [0, 4, 4, 0]
          }
        }
      ]
    };
  }

  formatCurrency(value: number): string {
    return this.currencyPipe.transform(value, 'BRL', 'symbol', '1.2-2', 'pt-BR') || 'R$ 0,00';
  }
}
