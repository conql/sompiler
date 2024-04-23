#include "tm.h"
#include "tm.cpp"

int main() {
	char codefile[255] = "";
	printf("Please input the file name: ");
	scanf("%s", codefile);
	tmain(codefile);
	return 0;
}