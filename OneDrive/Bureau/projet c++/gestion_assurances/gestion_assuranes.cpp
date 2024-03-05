#include "gestion_assuranes.h"
#include "ui_gestion_assuranes.h"
#include "assurances.h"
#include <QMessageBox>

gestion_assuranes::gestion_assuranes(QWidget *parent)
    : QMainWindow(parent)
    , ui(new Ui::gestion_assuranes)
{
    ui->setupUi(this);

    ui->tableView->setModel(Assu.afficher());

}

gestion_assuranes::~gestion_assuranes()
{
    delete ui;
}


void gestion_assuranes::on_pushButton_21_clicked()
{
    ui->stackedWidget->setCurrentIndex(1);
}

void gestion_assuranes::on_pushButton_20_clicked()
{
     ui->stackedWidget->setCurrentIndex(0);
}

void gestion_assuranes::on_pushButton_22_clicked()
{
       ui->stackedWidget->setCurrentIndex(2);
}


void gestion_assuranes::on_pushButton_24_clicked()
{
    int id =ui-> lineEdit_2->text() .toInt ();
    bool test=Assu.supprimer(id);

    if(test)
    { QMessageBox::information(nullptr, QObject::tr("ok"),
                               QObject::tr("suppression effectue\n"
                                           "click cancel to exit "), QMessageBox::Cancel);
    }
    else
    {
    QMessageBox::critical(nullptr,QObject::tr("not ok"),
                               QObject::tr("suppression non effectue \n"
                                           "click cancel to exit."), QMessageBox::Cancel);
    }
}

