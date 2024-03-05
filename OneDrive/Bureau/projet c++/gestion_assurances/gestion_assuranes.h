#ifndef GESTION_ASSURANES_H
#define GESTION_ASSURANES_H
#include "assurances.h"
#include <QSqlDatabase>

#include <QMainWindow>

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

private:
    Ui::gestion_assuranes *ui;

    assurances Assu;
};

#endif // GESTION_ASSURANES_H
