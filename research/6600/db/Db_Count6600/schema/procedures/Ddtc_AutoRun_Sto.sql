-- SQL_STORED_PROCEDURE dbo.Ddtc_AutoRun_Sto (modified 2012-04-21T07:53:24.623)


CREATE  PROCEDURE  [dbo].[Ddtc_AutoRun_Sto] 
AS
/*定义变量*/
    Declare @SqlStr Varchar(1000)     --定义查询语句
    Declare @Op_Date DateTime         --设置昨天时间(日期格式)
    Declare @Op_Date_Str Varchar(10)  --设置昨天时间(字符串格式)
    Declare @Op_Day Varchar(2)        --设置今天所在本月的那一天


    Set @Op_Date=DateAdd(Day,-1,getdate())
    --Set @Op_Date=getdate()
    Set @Op_Date_Str=Convert(Char(10),@Op_Date,120)
    Set @Op_Day=Day(@Op_Date)

/*开始第一步：更新注册用户数据*/
	/*删除旧的注册用户数据*/
	IF  EXISTS (SELECT * FROM dbo.sysobjects WHERE id = OBJECT_ID(N'[dbo].[Ddtc_Users_Detail]') AND OBJECTPROPERTY(id, N'IsUserTable') = 1)
	DROP TABLE [Ddtc_Users_Detail]

	/*更新最新的注册用户数据*/  
    SELECT  * INTO Ddtc_Users_Detail FROM Db_Tank_Copy.dbo.Sys_Users_Detail  
           Where Convert(Char(10), lastdate,120)=@Op_Date_Str
                                         Or Convert(Char(10), lastdatesecond,120)=@Op_Date_Str
                                    Or Convert(Char(10), lastdatethird,120)=@Op_Date_Str    

    /*通用临时表:获昨天在线用户数据*/
   Create Table #Temp_Login(UserId Int,Moneys Int)
   Insert Into #Temp_Login
          Select UserId,Money From Ddtc_Users_Detail 




/*操作第一步：系统自动更新用户登陆数据*/
    /*插入昨天新注册的在线的户*/
    Insert Into Count_UserLoginLog(UserId,LoginMonth)         
    Select UserId,Convert(Char(7), @Op_Date,120) From #Temp_Login  As A 
           Where Not Exists 
               (Select UserId From Count_UserLoginLog B Where A.UserId=B.UserId And B.LoginMonth= Convert(Char(7), @Op_Date,120))

   /*更新昨天在线用户*/ 
   Set @SqlStr='Update A Set  Day'+@Op_Day+'=1
         From Count_UserLoginLog A, #Temp_Login B
         
         Where A.UserId=B.UserId and A.LoginMonth='''+Convert(Char(7), @Op_Date,120)+''''
   Exec  (@SqlStr)

/*操作第二步：系统自动统计物品销售总金额、总数*/
 Exec Ddtc_Count_Item_Sto @Op_Date


 
/*操作第三步：系统自动更新用户当前点券数量*/
    /*插入昨天新注册的的用户*/
    Insert Into Count_UserPointLog(UserId,LoginMonth)         
    Select UserId,Convert(Char(7), @Op_Date,120) From #Temp_Login  As A 
           Where Not Exists 
               (Select UserId From Count_UserPointLog B Where A.UserId=B.UserId And B.LoginMonth= Convert(Char(7), @Op_Date,120))

    /*更新昨天用户身上点券数据*/
    Set @SqlStr='Update A set A.Day'+@Op_Day+'=Isnull(B.Moneys,0)
		 From Count_UserPointLog A , #Temp_Login B                 
         Where  A.UserId= B.UserId and LoginMonth='''+ Convert(Char(7), @Op_Date,120)+''''
    Exec (@SqlStr) 


/*操作第四步：系统自动更新用户消费金额*/
    /*插入昨天新注册的的用户*/
    Insert Into Count_UserConsumeLog(UserId,LoginMonth)         
    Select UserId,Convert(Char(7), @Op_Date,120) From #Temp_Login  As A 
           Where Not Exists 
               (Select UserId From Count_UserConsumeLog B Where A.UserId=B.UserId And B.LoginMonth= Convert(Char(7), @Op_Date,120))

    /*获取昨天用户购物金额数据*/
    Create Table #Temp_Shop(UserId Int,Moneys Int)
    Insert Into  #Temp_Shop
			Select UserId,sum(Money) As Moneys From Count_Shop 
				   Where Convert(Char(10), EnterTime,120)=@Op_Date_Str
                         And Money>0
            Group By Userid, Convert(Char(10), EnterTime,120)

    /*更新用户身上购物消费金额数据*/
    Set @SqlStr='Update A set A.Day'+@Op_Day+'=Isnull(B.Moneys,0)
		 From Count_UserConsumeLog A  , #Temp_Shop B                 
         Where A.UserId= B.UserId and LoginMonth='''+ Convert(Char(7), @Op_Date,120)+''''
    Exec (@SqlStr)


/*操作第五步：生成运营系统日志*/
    Exec [Ddtc_AutoExport_Sto] @Op_Date



/*结束第一步：删除所有临时表*/ 
    Drop Table #Temp_Login
    Drop Table #Temp_Shop




/*操作第6步：Create Access*/
    Exec Ddtc_AutoOut_Access @Op_Date




set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON











GO
