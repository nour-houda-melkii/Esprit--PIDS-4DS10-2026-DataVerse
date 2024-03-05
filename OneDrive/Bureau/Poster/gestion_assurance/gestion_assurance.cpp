#include "gestion_assurance.h"
#include "ui_gestion_assurance.h"

gestion_assurance::gestion_assurance(QWidget *parent)
    : QMainWindow(parent)
    , ui(new Ui::gestion_assurance)
{
    ui->setupUi(this);
}

gestion_assurance::~gestion_assurance()
{
    delete ui;
}

