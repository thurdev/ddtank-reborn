-- SQL_STORED_PROCEDURE dbo.Ddt_Sys_Users_Goods (modified 2012-04-21T07:53:24.717)

--创建人:危超云
--创建时间:2008-12-16
--说明:用户身上物品(SearchKey表示查找关键字，Type表示是0用户名、1用户昵称)
--修改人:向洪
--修改时间:2009-7-3
CREATE  PROCEDURE  [dbo].[Ddt_Sys_Users_Goods] 
@SearchKey NVarchar(200),
@SelectType Int
AS
/*第一步：查询出当前用户名或昵称*/
Create Table #Temp_User(UserID Int)
If @SelectType=1
    Begin
Insert Into #Temp_User
  SELECT UserId FROM Db_Tank_Copy.Dbo.Sys_Users_Detail with(nolock) 
         Where UserName=@SearchKey Or NickName =@SearchKey
    End
ELSE
    Begin
Insert Into #Temp_User
  SELECT UserId FROM Db_Tank_copy.Dbo.Sys_Users_Detail with(nolock)
         Where UserName like '%' +@SearchKey +'%' Or NickName like '%'+ @SearchKey+'%'
    End




/*第二步：用户身上物品分类*/
Create Table #Temp_Goods(UserID Int, BagType Int , Place  Int , [Count]  Int, StrengthenLevel Varchar(5), AttackCompose Varchar(5),  DefendCompose  Varchar(5), LuckCompose Varchar(5), AgilityCompose  Varchar(5), BeginDate  Varchar(20), ValidDate  Varchar(5),GoodsName Varchar(100))
Insert Into #Temp_Goods
SELECT A.UserID, B.BagType,  B.Place, B.[Count], B.StrengthenLevel, B.AttackCompose, 
      B.DefendCompose, B.LuckCompose, B.AgilityCompose, B.BeginDate, B.ValidDate,C.Name
FROM #Temp_User A 
   Left Outer Join Db_Tank_copy.Dbo.Sys_Users_Goods B
      On A.UserId=B.UserId
   Left Outer Join Db_Tank_copy.Dbo.Shop_Goods C
      On B.TemplateId=C.TemplateId

/*第三步:用户资料与用户信息绑定*/

Create Table #Temp_Total(UserId Int,UserName Varchar(50), NickName NVarchar(50) ,  Sex Varchar(20), Gold  Varchar(20),  Money Varchar(20) , LastDate Varchar(20), Type  Varchar(20))
Insert Into #Temp_Total
Select A.UserId  ,B.UserName,B.NickName,Case B.Sex When 0 Then '女' Else '男' End As Sex,Cast(B.Gold As Varchar(20)) As Gold,Cast(B.Money As Varchar(20)) As Money,Convert(Char(10), B.LastDate,120)  As LastDate,'' As Type From #Temp_User A 
   Left Outer Join  Db_Tank_copy.Dbo.Sys_Users_Detail B
   On A.UserId=B.UserId
Union All
Select Top 1 C.UserId,' 身上物品','物品名称',
      '强化等级','攻击加成','防御加成','幸运加成','敏捷加成'
 From #Temp_Goods C Where BagType=0 And Place>=0 And Place <=30
Union All
Select C.UserId,' 身上物品',C.GoodsName,
      C.StrengthenLevel,C.AttackCompose,C.DefendCompose,C.LuckCompose,C.AgilityCompose
 From #Temp_Goods C Where BagType=0 And Place>=0 And Place <=30

Union All
Select Top 1 C.UserId,' 道具物品','物品名称',
      '强化等级','攻击加成','防御加成','幸运加成','敏捷加成'
 From #Temp_Goods C Where BagType=1 And Place>=0 And Place <=49
Union All
Select D.UserId,' 道具物品',D.GoodsName,
      D.StrengthenLevel,D.AttackCompose,D.DefendCompose,D.LuckCompose,D.AgilityCompose
 From #Temp_Goods D Where BagType=1 And Place>=0 And Place <=49
Union All
Select Top 1 C.UserId,' 装备物品','物品名称',
      '强化等级','攻击加成','防御加成','幸运加成','敏捷加成'
 From #Temp_Goods C Where BagType=0 And Place>=31 And Place <=79
Union All
Select E.UserId,' 装备物品',E.GoodsName,
       E.StrengthenLevel,E.AttackCompose,E.DefendCompose,E.LuckCompose,E.AgilityCompose
 From #Temp_Goods E Where BagType=0 And Place>=31 And Place <=79
 

Select * From #Temp_Total Order by UserId,UserName desc

GO
