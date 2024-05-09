#ifndef GESTION_ASSURANES_H
#define GESTION_ASSURANES_H
#include"assurances.h"
#include <QMainWindow>
#include <QTextDocument>
#include <QTextCursor>
#include <QTextDocumentWriter>
#include <QtCharts/QChartView>
#include <QtCharts/QPieSeries>
#include <QtCharts/QPieSlice>
#include <QLineEdit>

QT_BEGIN_NAMESPACE
namespace Ui { class gestion_assuranes; }
QT_END_NAMESPACE


class gestion_assuranes : public QMainWindow
{
    Q_OBJECT

public:
    gestion_assuranes(QWidget *parent = nullptr);
    ~gestion_assuranes();


private slots:
    void on_pushButton_21_clicked();
    void on_pushButton_20_clicked();
    void on_pushButton_22_clicked();
    void on_pushButton_24_clicked();
    void on_id_cursorPositionChanged(int arg1, int arg2);
    void on_supprimer1_clicked();
    void on_supprimer2_clicked();
    void on_ajouter_clicked();
    void on_modifier1_clicked();
    void on_modifier1_2_clicked();
    void on_ajouter_2_clicked();
    void on_rechercher_clicked();
    void on_trier_clicked();
    void on_pushButton_19_clicked();
    void on_prix_cursorPositionChanged(int arg1, int arg2);
    void on_lineEdit_cursorPositionChanged(int arg1, int arg2);
    void on_pushButton_14_clicked();
    void on_pushButton_8_clicked();
    void on_menu_clicked();
    void on_word_clicked();
    void on_pushButton_13_clicked();
    void on_pushButton_15_clicked();
    void on_statics_clicked();
    void on_email_clicked();
    void on_pushButton_12_clicked();
    void on_pushButton_clicked();
    void on_pushButton_2_clicked();
    void on_pushButton_3_clicked();



private:
    Ui::gestion_assuranes *ui;
    assurances etmp;
     QString old_type_assurances;
     QSqlQueryModel *model;





};

#endif // GESTION_ASSURANES_H
