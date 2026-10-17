-- SQL_STORED_PROCEDURE dbo.Ddtc_Count_Item_Sto (modified 2012-04-21T07:53:24.763)

-- =============================================
-- Author:		Bill
-- Create date: 2010年4月14日12:21:28更新
-- Description:	<自动更新指定的时间内，用户消费的商品数量,金额,金币,礼券,勋章>
-- =============================================
CREATE  PROCEDURE [dbo].[Ddtc_Count_Item_Sto]
@Op_Date DateTime
AS
/*第一步：获取最新购物数据*/
    Declare @Op_Day Varchar(2)        --设置今天所在本月的那一天
    Set @Op_Day=Day(@Op_Date)
    Declare @SqlStr Varchar(1000)     --定义查询语句

	--删除旧的商品分类
	IF  EXISTS (SELECT * FROM dbo.sysobjects WHERE id = OBJECT_ID(N'[dbo].[Ddtc_Shop_Goods]') AND OBJECTPROPERTY(id, N'IsUserTable') = 1)
	DROP TABLE Ddtc_Shop_Goods

	--创建最新物品表
	SELECT  * INTO Ddtc_Shop_Goods FROM Db_Tank_Copy.dbo.Shop_Goods 

 

	--更新最新的物品数据
	Insert Into Count_ItemDataLog(TemplateID,LoginMonth)         
		Select TemplateID,Convert(Char(7), @Op_Date,120) From Ddtc_Shop_Goods  As A 
           Where Not Exists 
               (Select TemplateID From Count_ItemDataLog B Where A.TemplateID=B.TemplateID And B.LoginMonth= Convert(Char(7), @Op_Date,120))
 
	--更新最新的物品总额
	Insert Into Count_ItemMoneyLog(TemplateID,LoginMonth)         
		Select TemplateID,Convert(Char(7), @Op_Date,120) From Ddtc_Shop_Goods  As A 
           Where Not Exists 
               (Select TemplateID From Count_ItemMoneyLog B Where A.TemplateID=B.TemplateID And B.LoginMonth= Convert(Char(7), @Op_Date,120))
 
  
/*第二步：获取物品消费总数量、单价*/
    --生成10W个记录编号
	SELECT TOP 200
	id = identity(bigint,1,1) 
	INTO #Temp1 
	FROM syscolumns a, syscolumns b



    --切割购物车商品编号	 
    Create Table #Temp_GoodId(Id BigInt IDENTITY(1,1),GoodId Varchar(10))
    Insert Into #Temp_GoodId
    Select  News=Substring(A.GoodId,B.Id,CharIndex(',',A.GoodId+',',B.Id)-B.Id) From  db_logs.dbo.Log_Money A,#Temp1 B
  	        Where  SUBSTRING(',' + A.GoodId, B.Id, 1) = ','                    
                   And A.GoodsTYpe!=''
                   And Convert(Char(10), A.EnterTime,120)= Convert(Char(10), @Op_Date,120)

   

    --切割购物车商品类型     
    Create Table #Temp_GoodsType(Id BigInt IDENTITY(1,1),GoodsType Varchar(10))
    Insert Into #Temp_GoodsType
    Select  News=Substring(A.GoodsType,B.Id,CharIndex(',',A.GoodsType+',',B.Id)-B.Id) From  db_logs.dbo.Log_Money A,#Temp1 B
  	        Where  SUBSTRING(',' + A.GoodsType, B.Id, 1) = ','                    
                   And A.GoodsTYpe !=''
                   And Convert(Char(10), A.EnterTime,120)= Convert(Char(10), @Op_Date,120)

   
     
     --计算出商品的数量、与类型
     Create Table #Temp_Goods(GoodId Int,Goods Int,GoodType Varchar(10))
     Insert Into #Temp_Goods
     Select  A.GoodId,COUNT(*) As Goods,B.GoodsType From #Temp_GoodId A 
            Left Outer Join #Temp_GoodsType B
                  On A.Id=B.Id
            Group By A.GoodId,B.GoodsType
     


                  

     --计算汇总数量、金额
     Create Table #Temp_Total(GoodId Int,Goods Int,GoodMoney Int)
     Insert Into #Temp_Total
     Select A.GoodId,Sum(A.Goods) As Goods, Sum(Case A.GoodType When '1' Then B.Price1*A.Goods 
                           When '2' Then B.Price2*A.Goods 
						   When '3' Then B.Price3*A.Goods  Else 0 End) From #Temp_Goods A 
            Left Outer Join Ddtc_Shop_Goods B
				 On A.GoodId=B.TemplateId
            Group By A.GoodId

  
     
/*第三步：更新商品数量、总额*/
     --更新商品的数量
	 Set @SqlStr=' Update A Set A.Day'+@Op_Day+'=Isnull(B.Goods,0)
           From Count_ItemDataLog A ,#Temp_Total B           
                Where  A.TemplateId=B.GoodId and LoginMonth='''+Convert(Char(7),@Op_Date,120)+''''    
    Exec (@SqlStr)
    --更新商品总额
    Set @SqlStr='Update A Set A.Day'+@Op_Day+'=IsNull(B.GoodMoney,0)
             From Count_ItemMoneyLog A , #Temp_Total B                   
                  Where A.TemplateId=B.GoodId and LoginMonth='''+Convert(Char(7),@Op_Date,120)+''''    
    Exec (@SqlStr)
 
/*第四步：删除所有临时表*/
     Drop Table #Temp1
     Drop Table #Temp_GoodId
     Drop Table #Temp_GoodsType
     Drop Table #Temp_Goods
     Drop Table #Temp_Total

GO
