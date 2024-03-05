#include "gestion_contrat.h"

#include <QApplication>

int main(int argc, char *argv[])
{
    QApplication a(argc, argv);
    gestion_contrat w;
    w.show();
    return a.exec();
}
